const moment = require('moment');
const { Op } = require('sequelize');

const db = require('../../models');
const response = require('../../lib/response');

const week = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const today = moment().format('YYYY-MM-DD');
    const { firstDay, lastDay } = getFirstDayAndLastDay(today);
    const answers = await getWeekAnswers({ userId, firstDay, lastDay });
    res.json(response({ data: { today, answers } }));
  } catch (error) {
    console.log(error.message);
    res.json(response({ status: 500, message: error.message }));
  }
};

const month = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { date: queryDate } = req.query;
    const { weeks, date } = getMonthDate(queryDate);
    const answers = await getMonthAnswers({ weeks, userId });
    res.json(response({ data: { date, answers } }));
  } catch (error) {
    console.log(error.message);
    res.json(response({ status: 500, message: error.message }));
  }
};

const date = async (req, res, next) => {
  const { id: userId } = req.user;
  const { date } = req.params;
  const answer = await getAnswerByDate({ userId, date });
  res.json(response({ data: answer }));
};

const create = async (req, res, next) => {
  const userId = req.user.id;
  const date = moment().format('YYYY-MM-DD');
  const { file: imageUrl } = req;
  const { content, missionId } = req.body;

  try {
    if (!req && !content) {
      return res.json(response({ status: 412, message: '필수 파라미터가 부족합니다.' }));
    }

    const beforeAnswer = await db.answers.findOne({
      where: {
        userId,
        date,
      },
    });
    if (!!beforeAnswer) {
      return res.json(response({ status: 400, message: '해당날짜에 답변이 존재합니다.' }));
    }

    const checkMission = await db.missions.findOne({ where: { id: missionId } });
    if (!checkMission) {
      return res.json(response({ status: 412, message: '존재하지않는 missionId.' }));
    }

    let cardFile = await db.files.findOne({ where: { date } });
    if (!cardFile) {
      const id = moment().day() === 0 ? 7 : moment().day();
      cardFile = await db.files.findOne({ where: { id } });
    }
    const { cardUrl } = cardFile;

    if (!imageUrl) {
      const newAnswer = await db.answers.create({
        userId,
        missionId,
        cardUrl,
        content,
        date,
      });
      const answer = await db.answers.findOne({
        where: { id: newAnswer.id },
        include: [
          {
            model: db.missions,
          },
        ],
      });
      return res.json(response({ status: 201, data: answer }));
    }

    const newAnswer = await db.answers.create({
      userId,
      missionId,
      imageUrl,
      cardUrl,
      content,
      date,
    });
    const answer = await db.answers.findOne({
      where: { id: newAnswer.id },
      include: [
        {
          model: db.missions,
        },
      ],
    });
    return res.json(response({ status: 201, data: answer }));
  } catch (e) {
    console.log(e);
    return res.json(response({ status: 500, message: e.message }));
  }
};
const update = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const { id: userId } = req.user;
  const { content, missionId } = req.body;
  const { file: imageUrl } = req;

  if (isNaN(userId)) {
    return res.json(response({ status: 412, message: 'id가 올바르지 않습니다.' }));
  }
  if (!imageUrl && !content) {
    return res.json(response({ status: 404, message: '필수 파라미터가 부족합니다.' }));
  }
  const answer = await db.answers.findOne({ where: { id } });
  if (!answer) {
    return res.json(response({ status: 404, message: '존재하지않는 answerId.' }));
  }

  try {
    if (!imageUrl) {
      await db.answers.update(
        {
          userId,
          missionId,
          content,
        },
        {
          where: {
            id,
          },
        },
      );
      const answer = await db.answers.findOne({
        where: { id },
        include: [
          {
            model: db.missions,
          },
        ],
      });
      return res.json(response({ data: answer }));
    }
    await db.answers.update(
      {
        userId,
        missionId,
        imageUrl,
        content,
      },
      {
        where: {
          id,
        },
      },
    );
    const answer = await db.answers.findOne({
      where: { id },
      include: [
        {
          model: db.missions,
        },
      ],
    });
    return res.json(response({ data: answer }));
  } catch (e) {
    console.log(e);
    return res.json(response({ status: 500, message: e.message }));
  }
};

const destroy = async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.json(response({ status: 412, message: 'id가 올바르지 않습니다.' }));
  }
  const userId = req.user.id;
  try {
    const answer = await db.answers.findOne({
      where: {
        id,
        userId,
      },
    });
    if (!answer) {
      return res.json(response({ status: 404, message: '유효하지 않은 answerId' }));
    }
    await db.answers.destroy({
      where: {
        id,
      },
    });
    res.json(response({ status: 204, message: '답변을 삭제 했습니다.' }));
  } catch (e) {
    console.log(e);
    return res.json(response({ status: 500, message: e.message }));
  }
};

module.exports = { week, month, date, create, update, destroy };

const getFirstDayAndLastDay = today => {
  const day = moment(today).day();
  let first = -7;
  let last = 1;
  if (day != 0) {
    first = day * -1;
    last = 8 - day;
  }
  const firstDay = moment(today)
    .add(first, 'days')
    .format('YYYY-MM-DD');
  const lastDay = moment(today)
    .add(last, 'days')
    .format('YYYY-MM-DD');
  return { firstDay, lastDay };
};

const getWeekAnswers = async ({ userId, firstDay, lastDay }) => {
  const ExistAnswers = await db.answers.findAll({
    where: {
      userId,
      date: {
        [Op.gt]: firstDay,
        [Op.lt]: lastDay,
      },
    },
    include: [
      {
        model: db.missions,
      },
    ],
  });
  return (answers = new Array(7).fill({}).map((_, index) => {
    return (
      ExistAnswers.find(
        element =>
          element.date ===
          moment(firstDay)
            .add(index + 1, 'days')
            .format('YYYY-MM-DD'),
      ) || null
    );
  }));
};

const getMonthDate = queryDate => {
  const date = !!queryDate ? moment(queryDate).date(1) : moment().date(1);
  let { firstDay, lastDay } = getFirstDayAndLastDay(date);
  const weeks = [[firstDay, lastDay]];
  firstDay = moment(firstDay);
  lastDay = moment(lastDay);

  while (lastDay.month() === date.month()) {
    firstDay = moment(firstDay).add(7, 'days');
    lastDay = moment(lastDay).add(7, 'days');
    weeks.push([firstDay.format('YYYY-MM-DD'), lastDay.format('YYYY-MM-DD')]);
  }
  return { weeks, date: date.format('YYYY-MM-DD') };
};

const getMonthAnswers = ({ weeks, userId }) => {
  return Promise.all(
    weeks.map(([firstDay, lastDay]) => {
      return getWeekAnswers({ userId, firstDay, lastDay });
    }),
  );
};

const getAnswerByDate = async ({ userId, date }) => {
  return db.answers.findOne({
    where: {
      userId,
      date,
    },
    include: [
      {
        model: db.missions,
      },
    ],
  });
};
