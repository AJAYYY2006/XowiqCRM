export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' })
    }

    const currentRole = String(req.userRole || req.user.user_metadata?.role || 'user').toLowerCase()
    
    // Super admin bypass
    if (['admin', 'administrator'].includes(currentRole)) {
      return next()
    }

    if (allowedRoles.includes('*') || allowedRoles.map(r => r.toLowerCase()).includes(currentRole)) {
      return next()
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Access restricted. Role '${currentRole}' is not authorized for this resource.`
    })
  }
}
