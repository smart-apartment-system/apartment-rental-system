// // 🔥 Role-based authorization middleware

// export const authorizeRoles = (...allowedRoles) => {
//   return (req, res, next) => {
//     try {
//       // 1️⃣ Check if user exists (from auth middleware)
//       if (!req.user) {
//         return res.status(401).json({
//           success: false,
//           message: "Unauthorized: Please login first",
//         });
//       }

//       // 2️⃣ Check if role is allowed
//       if (!allowedRoles.includes(req.user.role)) {
//         return res.status(403).json({
//           success: false,
//           message: `Forbidden: Role '${req.user.role}' is not allowed`,
//         });
//       }

//       // 3️⃣ All good
//       next();
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         message: "Role authorization error",
//       });
//     }
//   };
// };