import prisma from '../config/prisma.js'

export async function listQuotes(req, res, next) {
  try {
    const userId = req.userId
    const { status, accountId, limit = 50, offset = 0, search } = req.query

    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search
        ? {
            quoteName: { contains: search, mode: 'insensitive' }
          }
        : {})
    }

    const [total, quotes] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        include: {
          account: {
            select: { id: true, accountName: true, email: true }
          },
          opportunity: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: quotes,
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

export async function getQuoteById(req, res, next) {
  try {
    const { id } = req.params
    const quote = await prisma.quote.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        opportunity: true,
        invoices: true,
        customerServices: true
      }
    })

    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' })
    }

    res.json({ success: true, data: quote })
  } catch (err) {
    next(err)
  }
}

export async function createQuote(req, res, next) {
  try {
    const userId = req.userId
    const {
      quoteName,
      quote_name,
      opportunityId,
      opportunity_id,
      accountId,
      account_id,
      expiresAt,
      expires_at,
      totalPrice = 0,
      total_price,
      invoiceNumber,
      invoice_number,
      status = 'Unpaid',
      taxRate = 18,
      tax_rate,
      discount = 0,
      lineItems = [],
      line_items,
      customData = {},
      custom_data
    } = req.body

    const name = quoteName || quote_name
    if (!name) {
      return res.status(400).json({ success: false, error: 'Quote name is required' })
    }

    const quote = await prisma.quote.create({
      data: {
        userId,
        quoteName: name,
        opportunityId: opportunityId || opportunity_id || null,
        accountId: accountId || account_id || null,
        expiresAt: (expiresAt || expires_at) ? new Date(expiresAt || expires_at) : null,
        totalPrice: Number(totalPrice ?? total_price) || 0,
        invoiceNumber: invoiceNumber || invoice_number || null,
        status,
        taxRate: Number(taxRate ?? tax_rate) || 18,
        discount: Number(discount) || 0,
        lineItems: lineItems || line_items || [],
        customData: customData || custom_data || {}
      },
      include: {
        account: true
      }
    })

    res.status(201).json({ success: true, data: quote })
  } catch (err) {
    next(err)
  }
}

export async function updateQuote(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.quote.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quote not found' })
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(data.quoteName || data.quote_name ? { quoteName: data.quoteName || data.quote_name } : {}),
        ...(data.expiresAt || data.expires_at ? { expiresAt: new Date(data.expiresAt || data.expires_at) } : {}),
        ...(data.totalPrice !== undefined || data.total_price !== undefined
          ? { totalPrice: Number(data.totalPrice ?? data.total_price) }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.invoiceNumber || data.invoice_number ? { invoiceNumber: data.invoiceNumber || data.invoice_number } : {}),
        ...(data.taxRate !== undefined || data.tax_rate !== undefined
          ? { taxRate: Number(data.taxRate ?? data.tax_rate) }
          : {}),
        ...(data.discount !== undefined ? { discount: Number(data.discount) } : {}),
        ...(data.accountId !== undefined || data.account_id !== undefined
          ? { accountId: data.accountId ?? data.account_id }
          : {}),
        ...(data.lineItems !== undefined || data.line_items !== undefined
          ? { lineItems: data.lineItems ?? data.line_items }
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

export async function deleteQuote(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.quote.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quote not found' })
    }

    await prisma.quote.delete({ where: { id } })
    res.json({ success: true, message: 'Quote deleted successfully' })
  } catch (err) {
    next(err)
  }
}
