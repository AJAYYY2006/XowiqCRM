import prisma from '../config/prisma.js'

export async function listLeads(req, res, next) {
  try {
    const userId = req.userId
    const { status, limit = 50, offset = 0, search } = req.query

    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: leads,
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

export async function getLeadById(req, res, next) {
  try {
    const { id } = req.params
    const lead = await prisma.lead.findFirst({
      where: { id, userId: req.userId },
      include: {
        contacts: true,
        opportunities: true
      }
    })

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' })
    }

    res.json({ success: true, data: lead })
  } catch (err) {
    next(err)
  }
}

export async function createLead(req, res, next) {
  try {
    const userId = req.userId
    const { name, company, email, contact_number, contactNumber, status = 'new', source = 'API', custom_data, customData = {} } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Lead name is required' })
    }

    const lead = await prisma.lead.create({
      data: {
        userId,
        name,
        company: company || null,
        email: email || null,
        contactNumber: contactNumber || contact_number || '',
        status,
        source,
        customData: customData || custom_data || {}
      }
    })

    res.status(201).json({
      success: true,
      data: lead
    })
  } catch (err) {
    next(err)
  }
}

export async function updateLead(req, res, next) {
  try {
    const { id } = req.params
    const { name, company, email, contactNumber, contact_number, status, source, score, customData, custom_data } = req.body

    const existing = await prisma.lead.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' })
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(company !== undefined ? { company } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(contactNumber !== undefined || contact_number !== undefined
          ? { contactNumber: contactNumber ?? contact_number }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(score !== undefined ? { score: Number(score) } : {}),
        ...(customData !== undefined || custom_data !== undefined
          ? { customData: customData ?? custom_data }
          : {}),
        updatedAt: new Date()
      }
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteLead(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.lead.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Lead not found' })
    }

    await prisma.lead.delete({ where: { id } })
    res.json({ success: true, message: 'Lead deleted successfully' })
  } catch (err) {
    next(err)
  }
}
