import prisma from '../config/prisma.js'

export async function listContacts(req, res, next) {
  try {
    const userId = req.userId
    const { accountId, search, limit = 50, offset = 0 } = req.query

    const where = {
      userId,
      ...(accountId ? { accountId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { uniqueId: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        include: {
          account: {
            select: { id: true, accountName: true }
          },
          lead: {
            select: { id: true, name: true, company: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: contacts,
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

export async function getContactById(req, res, next) {
  try {
    const { id } = req.params
    const contact = await prisma.contact.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        lead: true,
        tickets: true
      }
    })

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }

    res.json({ success: true, data: contact })
  } catch (err) {
    next(err)
  }
}

export async function createContact(req, res, next) {
  try {
    const userId = req.userId
    const {
      name,
      email,
      phone,
      title,
      department,
      gender,
      accountId,
      account_id,
      leadId,
      lead_id,
      contactOwner,
      contact_owner,
      customData = {},
      custom_data
    } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Contact name is required' })
    }

    const contact = await prisma.contact.create({
      data: {
        userId,
        name,
        email: email || null,
        phone: phone || null,
        title: title || null,
        department: department || null,
        gender: gender || null,
        accountId: accountId || account_id || null,
        leadId: leadId || lead_id || null,
        contactOwner: contactOwner || contact_owner || null,
        customData: customData || custom_data || {}
      },
      include: {
        account: true
      }
    })

    res.status(201).json({ success: true, data: contact })
  } catch (err) {
    next(err)
  }
}

export async function updateContact(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.contact.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.department !== undefined ? { department: data.department } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.accountId !== undefined || data.account_id !== undefined
          ? { accountId: data.accountId ?? data.account_id }
          : {}),
        ...(data.leadId !== undefined || data.lead_id !== undefined
          ? { leadId: data.leadId ?? data.lead_id }
          : {}),
        ...(data.contactOwner !== undefined || data.contact_owner !== undefined
          ? { contactOwner: data.contactOwner ?? data.contact_owner }
          : {}),
        ...(data.customData !== undefined || data.custom_data !== undefined
          ? { customData: data.customData ?? data.custom_data }
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

export async function deleteContact(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.contact.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contact not found' })
    }

    await prisma.contact.delete({ where: { id } })
    res.json({ success: true, message: 'Contact deleted successfully' })
  } catch (err) {
    next(err)
  }
}
