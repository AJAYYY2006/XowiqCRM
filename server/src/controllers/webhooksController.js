import prisma from '../config/prisma.js'

export async function handleIncomingWebhook(req, res, next) {
  try {
    const { source = 'external', event, payload } = req.body
    console.log(`📥 [Webhook Received] Event: ${event} from ${source}`)

    if (event) {
      await prisma.activity.create({
        data: {
          userId: req.userId || '00000000-0000-0000-0000-000000000000',
          type: `Webhook: ${event}`,
          description: `Webhook received from ${source}: ${JSON.stringify(payload || {}).slice(0, 200)}`
        }
      }).catch(err => console.warn('Activity log error:', err.message))
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully via Prisma',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    next(err)
  }
}
