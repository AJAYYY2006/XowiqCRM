import prisma from '../config/prisma.js'

export async function listAccounts(req, res, next) {
  try {
    const userId = req.userId
    const { status, accountType, search, limit = 50, offset = 0 } = req.query

    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(accountType ? { accountType } : {}),
      ...(search
        ? {
            OR: [
              { accountName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { domain: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, accounts] = await Promise.all([
      prisma.account.count({ where }),
      prisma.account.findMany({
        where,
        include: {
          b2cStage: true,
          contacts: {
            take: 5,
            select: { id: true, name: true, email: true, phone: true }
          },
          _count: {
            select: {
              contacts: true,
              opportunities: true,
              invoices: true,
              tasks: true,
              tickets: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: accounts,
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

export async function getAccountById(req, res, next) {
  try {
    const { id } = req.params
    const account = await prisma.account.findFirst({
      where: { id, userId: req.userId },
      include: {
        b2cStage: true,
        contacts: true,
        opportunities: true,
        quotes: true,
        invoices: true,
        tasks: true,
        tickets: true,
        customerServices: {
          include: { service: true }
        }
      }
    })

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    res.json({ success: true, data: account })
  } catch (err) {
    next(err)
  }
}

export async function createAccount(req, res, next) {
  try {
    const userId = req.userId
    const {
      accountName,
      account_name,
      domain,
      accountOwner,
      account_owner,
      status = 'active',
      address,
      gender,
      dateOfBirth,
      date_of_birth,
      notes,
      email,
      phone,
      b2cStageId,
      b2c_stage_id,
      industry,
      website,
      accountType = 'B2B',
      account_type,
      customData = {},
      custom_data
    } = req.body

    const name = accountName || account_name
    if (!name) {
      return res.status(400).json({ success: false, error: 'Account name is required' })
    }

    const account = await prisma.account.create({
      data: {
        userId,
        accountName: name,
        domain: domain || null,
        accountOwner: accountOwner || account_owner || null,
        status,
        address: address || null,
        gender: gender || null,
        dateOfBirth: (dateOfBirth || date_of_birth) ? new Date(dateOfBirth || date_of_birth) : null,
        notes: notes || null,
        email: email || null,
        phone: phone || null,
        b2cStageId: b2cStageId || b2c_stage_id || null,
        industry: industry || null,
        website: website || null,
        accountType: accountType || account_type || 'B2B',
        customData: customData || custom_data || {}
      }
    })

    res.status(201).json({ success: true, data: account })
  } catch (err) {
    next(err)
  }
}

export async function updateAccount(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.account.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(data.accountName || data.account_name ? { accountName: data.accountName || data.account_name } : {}),
        ...(data.domain !== undefined ? { domain: data.domain } : {}),
        ...(data.accountOwner !== undefined || data.account_owner !== undefined
          ? { accountOwner: data.accountOwner ?? data.account_owner }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.dateOfBirth || data.date_of_birth
          ? { dateOfBirth: new Date(data.dateOfBirth || data.date_of_birth) }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.b2cStageId !== undefined || data.b2c_stage_id !== undefined
          ? { b2cStageId: data.b2cStageId ?? data.b2c_stage_id }
          : {}),
        ...(data.industry !== undefined ? { industry: data.industry } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.accountType || data.account_type
          ? { accountType: data.accountType || data.account_type }
          : {}),
        ...(data.customData !== undefined || data.custom_data !== undefined
          ? { customData: data.customData ?? data.custom_data }
          : {}),
        updatedAt: new Date()
      }
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.account.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    await prisma.account.delete({ where: { id } })
    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (err) {
    next(err)
  }
}
