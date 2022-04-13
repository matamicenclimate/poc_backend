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
        count: { $sum: 1 },
        supply: { $sum: '$supply' },
        type: { $first: '$type' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  let data = []
  userActivities.forEach((userActivity) => {
    if (userActivity.type === 'swap') {
      const extractedMonth = userActivity._id.split('-')[1]
      const extractedMonthName = monthNames[Number(extractedMonth) - 1]
      const monthIndex = labels.indexOf(extractedMonthName)
      data[monthIndex] = userActivity.supply
    }
  })

  data = Array.from(data, (item) => item || 0)
  data.forEach((d, i) => (data[i] = data[i - 1] === undefined ? 0 : data[i] > 0 ? data[i] : data[i - 1]))

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
