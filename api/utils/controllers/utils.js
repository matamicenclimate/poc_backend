'use strict'
async function contractsInfo(ctx) {
  return {
    appId: process.env.APP_ID,
    dumpAppId: process.env.DUMP_APP_ID
  }
}
async function chartBalanceMe(ctx) {
  const { user } = ctx.state
  const { type } = ctx.query

  let date = new Date()
  date = new Date(date.setMonth(date.getMonth() - 11))

  let labels,
    group_id_aggregate,
    data = await getOtherUserActivities(date, user)

  if (type === 'weekly') {
    const currentWeek = getCurrentWeek(new Date())
    labels = getWeekNumbers(currentWeek)
    group_id_aggregate = { $week: '$date' }
  } else {
    const monthNames = getMonthNames()
    labels = getLast12Months(monthNames)
    group_id_aggregate = { $dateToString: { format: '%Y-%m', date: '$date' } }
  }

  const userActivities = await getUserActivities(date, user, group_id_aggregate)

  data = calculateTotal(userActivities, type, labels, data)

  data = Array.from(data, (item) => item || 0)
  data.forEach((d, i) => {
    if (i !== 0) if (data[i - 1] === undefined) data[i] = data[i - 1] = 0
    if (data[i] === 0) data[i] = data[i - 1]
    if (i !== 0 && data[i] !== data[i - 1]) data[i] += data[i - 1]
  })

  return { labels, data }
}

function getMonthNames() {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
}

function getLast12Months(monthNames) {
  const today = new Date()
  const lastMonths = []
  for (let i = 11; i > 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    lastMonths.push(monthNames[date.getMonth()])
  }
  lastMonths.push(monthNames[today.getMonth()])

  return lastMonths
}

function getCurrentWeek(date) {
  const firstDayYear = new Date(date.getFullYear(), 0, 1)
  const numberOfDays = Math.floor((date - firstDayYear) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((date.getDay() + numberOfDays) / 7)

  return week
}

function getWeekNumbers(currentWeek) {
  const weekNumbers = []
  for (let i = currentWeek + 1; i <= 52; i++) {
    weekNumbers.push(i)
  }
  for (let j = 1; j <= currentWeek; j++) {
    weekNumbers.push(j)
  }
  return weekNumbers
}

async function getUserActivities(date, user, group_id_aggregate) {
  return await strapi.query('activities').model.aggregate([
    { $match: { date: { $gte: date }, user: user._id } },
    {
      $group: {
        _id: group_id_aggregate,
        income: { $sum: { $cond: [{ $eq: ['$type', 'swap'] }, '$supply', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'burn'] }, '$supply', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ])
}

function calculateTotal(userActivities, type, labels, data) {
  userActivities.forEach((userActivity) => {
    const total = userActivity.income - userActivity.expenses
    let activityId = type === 'weekly' ? userActivity._id : userActivity._id.split('-')[1]
    if (!type || type === 'monthly') {
      activityId = getMonthNames()[Number(activityId) - 1]
    }
    const index = labels.indexOf(activityId)
    data[index] = total
  })

  return data
}

async function getOtherUserActivities(toDate, user) {
  const otherUserActivities = await strapi.query('activities').model.aggregate([
    { $match: { date: { $lte: toDate }, user: user._id } },
    {
      $group: {
        _id: 'other_user_activities',
        income: { $sum: { $cond: [{ $eq: ['$type', 'swap'] }, '$supply', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'burn'] }, '$supply', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ])
  const otherUserActivitiesTotal =
    otherUserActivities.length > 0 ? otherUserActivities[0].income - otherUserActivities[0].expenses : 0

  return [otherUserActivitiesTotal]
}

module.exports = {
  chartBalanceMe,
  contractsInfo
}
