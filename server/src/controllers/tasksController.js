import prisma from '../config/prisma.js'

export async function listTasks(req, res, next) {
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
            title: { contains: search, mode: 'insensitive' }
          }
        : {})
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          account: {
            select: { id: true, accountName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: Number(offset),
        take: Number(limit)
      })
    ])

    res.json({
      success: true,
      data: tasks,
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

export async function getTaskById(req, res, next) {
  try {
    const { id } = req.params
    const task = await prisma.task.findFirst({
      where: { id, userId: req.userId },
      include: {
        account: true,
        customerServices: true
      }
    })

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    res.json({ success: true, data: task })
  } catch (err) {
    next(err)
  }
}

export async function createTask(req, res, next) {
  try {
    const userId = req.userId
    const {
      title,
      dueDate,
      due_date,
      status = 'Open',
      priority = 'Medium',
      relatedTo,
      related_to,
      relatedId,
      related_id,
      taskType,
      task_type,
      owner,
      accountId,
      account_id,
      assignedTo,
      assigned_to,
      customData = {},
      custom_data
    } = req.body

    if (!title) {
      return res.status(400).json({ success: false, error: 'Task title is required' })
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        dueDate: (dueDate || due_date) ? new Date(dueDate || due_date) : null,
        status,
        priority,
        relatedTo: relatedTo || related_to || null,
        relatedId: relatedId || related_id || null,
        taskType: taskType || task_type || null,
        owner: owner || null,
        accountId: accountId || account_id || null,
        assignedTo: assignedTo || assigned_to || null,
        customData: customData || custom_data || {}
      },
      include: {
        account: true
      }
    })

    res.status(201).json({ success: true, data: task })
  } catch (err) {
    next(err)
  }
}

export async function updateTask(req, res, next) {
  try {
    const { id } = req.params
    const data = req.body

    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.dueDate || data.due_date ? { dueDate: new Date(data.dueDate || data.due_date) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.relatedTo !== undefined || data.related_to !== undefined
          ? { relatedTo: data.relatedTo ?? data.related_to }
          : {}),
        ...(data.relatedId !== undefined || data.related_id !== undefined
          ? { relatedId: data.relatedId ?? data.related_id }
          : {}),
        ...(data.taskType || data.task_type ? { taskType: data.taskType || data.task_type } : {}),
        ...(data.owner !== undefined ? { owner: data.owner } : {}),
        ...(data.accountId !== undefined || data.account_id !== undefined
          ? { accountId: data.accountId ?? data.account_id }
          : {}),
        ...(data.assignedTo !== undefined || data.assigned_to !== undefined
          ? { assignedTo: data.assignedTo ?? data.assigned_to }
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

export async function deleteTask(req, res, next) {
  try {
    const { id } = req.params
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' })
    }

    await prisma.task.delete({ where: { id } })
    res.json({ success: true, message: 'Task deleted successfully' })
  } catch (err) {
    next(err)
  }
}
