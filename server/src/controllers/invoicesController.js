import prisma from '../config/prisma.js'

export async function listInvoices(req, res, next) {
  try {
    const userId = req.userId
    const { status, accountId, limit = 50, offset = 0, search } = req.query

    const where = {
      userId,
      ...(status ? { status } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search
        ? {
            invoiceName: { contains: search, mode: 'insensitive' }
          }
        : {})
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          account: {
            select: { id: true, accountName: true, email: true }
          },
          opportunity: {
            select: { id: true, name: true }
          },
          quote: {
            select: { id: true, quoteName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: invoices,
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

export async function getInvoiceById(req, res, next) {
  try {
    const { id } = req.params
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        opportunity: true,
        quote: true
      }
    })

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }

    res.json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}

export async function createInvoice(req, res, next) {
  try {
    const userId = req.userId
    const {
      invoiceName,
      invoice_name,
      amount = 0,
      status = 'draft',
      dueDate,
      due_date,
      accountId,
      account_id,
      opportunityId,
      opportunity_id,
      quoteId,
      quote_id,
      lineItems = [],
      line_items,
      customData = {},
      custom_data
    } = req.body

    const name = invoiceName || invoice_name
    if (!name) {
      return res.status(400).json({ success: false, error: 'Invoice name is required' })
    }

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceName: name,
        amount: Number(amount) || 0,
        status,
        dueDate: (dueDate || due_date) ? new Date(dueDate || due_date) : null,
        accountId: accountId || account_id || null,
        opportunityId: opportunityId || opportunity_id || null,
        quoteId: quoteId || quote_id || null,
        lineItems: lineItems || line_items || [],
        customData: customData || custom_data || {}
      },
      include: {
        account: true
      }
    })

    res.status(201).json({ success: true, data: invoice })
  } catch (err) {
    next(err)
  }
}

export async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(data.invoiceName || data.invoice_name ? { invoiceName: data.invoiceName || data.invoice_name } : {}),
        ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.dueDate || data.due_date ? { dueDate: new Date(data.dueDate || data.due_date) } : {}),
        ...(data.paidAt || data.paid_at ? { paidAt: new Date(data.paidAt || data.paid_at) } : {}),
        ...(data.pdfUrl || data.pdf_url ? { pdfUrl: data.pdfUrl || data.pdf_url } : {}),
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

export async function deleteInvoice(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }

    await prisma.invoice.delete({ where: { id } })
    res.json({ success: true, message: 'Invoice deleted successfully' })
  } catch (err) {
    next(err)
  }
}
