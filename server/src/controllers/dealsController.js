import prisma from '../config/prisma.js'

export async function listDeals(req, res, next) {
  try {
    const userId = req.userId
    const { stage, search, limit = 50, offset = 0 } = req.query

    const where = {
      userId,
      ...(stage ? { stage } : {}),
      ...(search
        ? {
            name: { contains: search, mode: 'insensitive' }
          }
        : {})
    }

    const [total, deals] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              accountName: true,
              email: true,
              phone: true
            }
          },
          products: true
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: deals,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function getDealById(req, res, next) {
  try {
    const { id } = req.params
    const deal = await prisma.opportunity.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        lead: true,
        products: true,
        quotes: true,
        invoices: true
      }
    })

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' })
    }

    res.json({ success: true, data: deal })
  } catch (err) {
    next(err)
  }
}

export async function createDeal(req, res, next) {
  try {
    const userId = req.userId
    const {
      name,
      accountId,
      account_id,
      leadId,
      lead_id,
      stage = 'prospecting',
      amount = 0,
      probability = 50,
      expectedRevenue = 0,
      expected_revenue,
      closedDate,
      closed_date,
      owner,
      customData = {},
      custom_data
    } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Deal name is required' })
    }

    const deal = await prisma.opportunity.create({
      data: {
        userId,
        name,
        accountId: accountId || account_id || null,
        leadId: leadId || lead_id || null,
        stage,
        amount: Number(amount) || 0,
        probability: Number(probability) || 50,
        expectedRevenue: Number(expectedRevenue ?? expected_revenue) || 0,
        closedDate: closedDate || closed_date ? new Date(closedDate || closed_date) : null,
        owner: owner || null,
        customData: customData || custom_data || {}
      },
      include: {
        account: true
      }
    })

    res.status(201).json({ success: true, data: deal })
  } catch (err) {
    next(err)
  }
}

export async function updateDeal(req, res, next) {
  try {
    const { id } = req.params
    const {
      name,
      stage,
      amount,
      probability,
      expectedRevenue,
      expected_revenue,
      closedDate,
      closed_date,
      owner,
      accountId,
      account_id,
      customData,
      custom_data
    } = req.body

    const existing = await prisma.opportunity.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Deal not found' })
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(probability !== undefined ? { probability: Number(probability) } : {}),
        ...(expectedRevenue !== undefined || expected_revenue !== undefined
          ? { expectedRevenue: Number(expectedRevenue ?? expected_revenue) }
          : {}),
        ...(closedDate !== undefined || closed_date !== undefined
          ? { closedDate: (closedDate || closed_date) ? new Date(closedDate || closed_date) : null }
          : {}),
        ...(owner !== undefined ? { owner } : {}),
        ...(accountId !== undefined || account_id !== undefined
          ? { accountId: accountId ?? account_id }
          : {}),
        ...(customData !== undefined || custom_data !== undefined
          ? { customData: customData ?? custom_data }
          : {}),
        updatedAt: new Date()
      },
      include: {
        account: true
      }
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteDeal(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.opportunity.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Deal not found' })
    }

    await prisma.opportunity.delete({ where: { id } })
    res.json({ success: true, message: 'Deal deleted successfully' })
  } catch (err) {
    next(err)
  }
}
