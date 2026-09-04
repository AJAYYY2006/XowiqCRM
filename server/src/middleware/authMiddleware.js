import { supabaseServer } from '../config/supabase.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authorization token'
      })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseServer.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token session'
      })
    }

    // Attach user profile & metadata
    req.user = user
    req.userId = user.id
    req.userRole = user.user_metadata?.role || 'user'

    next()
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed: ' + err.message
    })
  }
}
