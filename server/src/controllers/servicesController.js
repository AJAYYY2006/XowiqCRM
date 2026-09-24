import prisma from '../config/prisma.js'

export async function listServices(req, res, next) {
  try {
    const { status, serviceType, search } = req.query

    const where = {
      ...(status ? { status } : {}),
      ...(serviceType ? { serviceType } : {}),
      ...(search
        ? {
            serviceName: { contains: search, mode: 'insensitive' }
          }
        : {})
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: services })
  } catch (err) {
    next(err)
  }
}

export async function createService(req, res, next) {
  try {
    const userId = req.userId
    const {
      serviceName,
      service_name,
      price = 0,
      reminderDays = 7,
      reminder_days,
      description,
      status = 'active',
      serviceType = 'Instant',
      service_type
    } = req.body

    const name = serviceName || service_name
    if (!name) {
      return res.status(400).json({ success: false, error: 'Service name is required' })
    }

    const service = await prisma.service.create({
      data: {
        userId,
        serviceName: name,
        price: Number(price) || 0,
        reminderDays: Number(reminderDays ?? reminder_days) || 7,
        description: description || null,
        status,
        serviceType: serviceType || service_type || 'Instant'
      }
    })

    res.status(201).json({ success: true, data: service })
  } catch (err) {
    next(err)
  }
}

export async function listCustomerServices(req, res, next) {
  try {
    const { accountId, status } = req.query

    const where = {
      ...(accountId ? { accountId } : {}),
      ...(status ? { status } : {})
    }

    const items = await prisma.customerService.findMany({
      where,
      include: {
        service: true,
        account: {
          select: { id: true, accountName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
}

export async function assignCustomerService(req, res, next) {
  try {
    const userId = req.userId
    const {
      accountId,
      account_id,
      serviceId,
      service_id,
      price,
      status = 'Active',
      notes,
      assignedDate,
      assigned_date,
      customData = {},
      custom_data
    } = req.body

    const accId = accountId || account_id
    const srvId = serviceId || service_id

    if (!accId || !srvId) {
      return res.status(400).json({ success: false, error: 'Account ID and Service ID are required' })
    }

    const item = await prisma.customerService.create({
      data: {
        userId,
        accountId: accId,
        serviceId: srvId,
        price: price !== undefined ? Number(price) : 0,
        status,
        notes: notes || null,
        assignedDate: (assignedDate || assigned_date) ? new Date(assignedDate || assigned_date) : new Date(),
        customData: customData || custom_data || {}
      },
      include: {
        service: true,
        account: true
      }
    })

    res.status(201).json({ success: true, data: item })
  } catch (err) {
    next(err)
  }
}
