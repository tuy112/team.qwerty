// routes>users.routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const emailSender = require('../config/email.js');
const router = express.Router();

// Middleware
const authMiddleware = require('../middlewares/authMiddleware.js');

// JWT
const jwt = require('jsonwebtoken');
// Model
const { Users } = require('../models/index.js');

const { Op } = require('sequelize');

// 회원가입 API (POST)
router.post('/signup', async (req, res) => {
  const { email, verifyNumberInput, password, passwordConfirm } = req.body;

  try {
    const existUserEmail = await Users.findOne({ where: { email } });
    const passwordCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;
    const hashedPassword = await bcrypt.hash(password, 10);

    emailVerifyHandler = () => {
      try {
        const verifyNumber = emailSender.sendGmail(email);
        res.status(200).json({ message: '전송 성공' });
        return verifyNumber;
      } catch {
        res.status(400).json({ message: '전송 실패' });
      }
    };

    if (!email || !verifyNumberInput || !password || !passwordConfirm) {
      return res.status(400).json({ message: '입력값이 유효하지 않습니다.' });
    }
    if (verifyNumberInput != verifyNumber) {
      return res.status(412).json({ message: '인증번호가 일치하지 않습니다.' });
    }
    if (existUserEmail) {
      return res.status(412).json({ message: '중복된 email입니다.' });
    }
    if (!password || password.length < 4 || !passwordCheck.test(password)) {
      return res.status(412).json({ message: '비밀번호 형식이 올바르지 않습니다.' });
    }
    if (password !== passwordConfirm) {
      return res.status(412).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    await Users.create({ email, password: hashedPassword, point });
    return res.status(201).json({ message: '회원 가입에 성공하였습니다.' });
  } catch {
    return res.status(400).json({ message: '사용자 계정 생성에 실패하였습니다.' });
  }
});

// log-in API (POST)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existUser = await Users.findOne({ where: { email } });
    const passwordMatch = await bcrypt.compare(password, existUser.password);
    if (!existUser || !passwordMatch) {
      return res.status(412).json({ message: 'email 또는 비밀번호를 확인해주세요.' });
    }
    // JWT 생성
    const token = jwt.sign({ userId: existUser.userId }, 'customized_secret_key');
    // Cookie 발급
    res.cookie('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: 'log-in 되었습니다.' });
  } catch {
    return res.status(400).json({ message: 'log-in에 실패하였습니다.' });
  }
});

// log-out API (POST)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    res.clearCookie('authorization');
    return res.status(200).json({ message: 'log-out 되었습니다.' });
  } catch {
    return res.status(400).json({ message: 'log-out에 실패하였습니다.' });
  }
});

// 사용자 정보 조회 API (GET)
router.get('/users/:userId', authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;

  try {
    const user = await Users.findOne({
      attributes: ['userId', 'email', 'point', 'createdAt', 'updatedAt'],
      where: { userId },
    });
    return res.status(200).json({ data: user });
  } catch {
    return res.status(400).json({ message: '사용자 정보 조회에 실패하였습니다.' });
  }
});

// 사용자 정보 수정 API (PUT)
router.put('/users/:userId', authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;
  const { password, newPassword, newPasswordConfirm } = req.body;

  try {
    const existUser = await Users.findOne({ where: { userId } });
    const passwordCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;
    const passwordMatch = await bcrypt.compare(password, existUser.password);
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    if (!password) {
      return res.status(400).json({ message: '입력값이 유효하지 않습니다.' });
    }
    if (!passwordMatch) {
      return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    if (newPassword !== newPasswordConfirm) {
      return res.status(412).json({ message: '변경된 비밀번호가 일치하지 않습니다.' });
    }
    if (!newPassword || newPassword.length < 4 || !passwordCheck.test(newPassword)) {
      return res.status(412).json({ message: '변경된 비밀번호 형식이 올바르지 않습니다.' });
    }

    await users.update({ password: hashedNewPassword }, { where: { userId } });
    return res.status(200).json({ message: '사용자 정보 수정에 성공하였습니다.' });
  } catch {
    return res.status(400).json({ message: '사용자 정보 수정에 실패하였습니다.' });
  }
});

// 회원탈퇴 API (DELETE)
router.delete('/users/:userId', authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;
  const { email, password } = req.body;

  try {
    const existUser = await Users.findOne({ where: { userId } });
    const passwordMatch = await bcrypt.compare(password, existUser.password);

    if (!email || !password) {
      return res.status(400).json({ message: '입력값이 유효하지 않습니다.' });
    }
    if (email !== existUser.email || !passwordMatch) {
      return res.status(412).json({ message: 'email 또는 비밀번호를 확인해주세요.' });
    }

    await Users.destroy({
      where: { [Op.and]: [{ userId }, { email: existUser.email }] },
    });
    return res.status(200).json({ message: '사용자 정보 삭제에 성공하였습니다.' });
  } catch {
    return res.status(400).json({ message: '사용자 정보 조회에 실패하였습니다.' });
  }
});

module.exports = router;