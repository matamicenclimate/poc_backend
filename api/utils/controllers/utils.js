'use strict'

async function chartBalanceMe(ctx) {
  const { user } = ctx.state
  const monthNames = getMonthNames()
  const labels = getLast12Months(monthNames)

  let fromDate = new Date()
  fromDate = new Date(fromDate.setMonth(fromDate.getMonth() - 11))
  fromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  ctx.query.date_gte = fromDate

  const userActivities = await strapi.query('activities').model.aggregate([
    { $match: { date: { $gte: fromDate }, user: user._id } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        income: { $sum: { $cond: [{ $eq: ['$type', 'swap'] }, '$supply', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'burn'] }, '$supply', 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ])

  let data = []
  userActivities.forEach((userActivity) => {
    const total = userActivity.income - userActivity.expenses
    const extractedMonth = userActivity._id.split('-')[1]
    const extractedMonthName = monthNames[Number(extractedMonth) - 1]
    const monthIndex = labels.indexOf(extractedMonthName)
    data[monthIndex] = total
  })

  data = Array.from(data, (item) => item || 0)
  data.forEach((d, i) => {
    if (data[i - 1] === undefined) data[i] = data[i - 1] = 0
    if (data[i] === 0) data[i] = data[i - 1]
    if (data[i] !== data[i - 1]) data[i] += data[i - 1]
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

module.exports = {
  chartBalanceMe,
}
