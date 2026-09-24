import prisma from '../config/prisma.js'

export async function listTickets(req, res, next) {
  try {
    const userId = req.userId
    const { status, priority, accountId, limit = 50, offset = 0, search } = req.query

    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: 'insensitive' } },
              { ticketNo: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          account: {
            select: { id: true, accountName: true }
          },
          contact: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: tickets,
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

export async function getTicketById(req, res, next) {
  try {
    const { id } = req.params
    const ticket = await prisma.ticket.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        contact: true
      }
    })

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }

    res.json({ success: true, data: ticket })
  } catch (err) {
    next(err)
  }
}

export async function createTicket(req, res, next) {
  try {
    const userId = req.userId
    const {
      subject,
      description,
      priority = 'medium',
      status = 'open',
      owner,
      contactId,
      contact_id,
      accountId,
      account_id,
      customData = {},
      custom_data
    } = req.body

    if (!subject) {
      return res.status(400).json({ success: false, error: 'Ticket subject is required' })
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId,
        subject,
        description: description || null,
        priority,
        status,
        owner: owner || null,
        contactId: contactId || contact_id || null,
        accountId: accountId || account_id || null,
        customData: customData || custom_data || {}
      },
      include: {
        account: true,
        contact: true
      }
    })

    res.status(201).json({ success: true, data: ticket })
  } catch (err) {
    next(err)
  }
}

export async function updateTicket(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.ticket.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(data.subject !== undefined ? { subject: data.subject } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.owner !== undefined ? { owner: data.owner } : {}),
        ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
        ...(data.closedAt || data.closed_at ? { closedAt: new Date(data.closedAt || data.closed_at) } : {}),
        ...(data.contactId !== undefined || data.contact_id !== undefined
          ? { contactId: data.contactId ?? data.contact_id }
          : {}),
        ...(data.accountId !== undefined || data.account_id !== undefined
          ? { accountId: data.accountId ?? data.account_id }
          : {}),
        ...(data.customData !== undefined || data.custom_data !== undefined
          ? { customData: data.customData ?? data.custom_data }
          : {}),
        updatedAt: new Date()
      },
      include: {
        account: true,
        contact: true
      }
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteTicket(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.ticket.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }

    await prisma.ticket.delete({ where: { id } })
    res.json({ success: true, message: 'Ticket deleted successfully' })
  } catch (err) {
    next(err)
  }
}
