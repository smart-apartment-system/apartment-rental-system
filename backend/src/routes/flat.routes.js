import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { assignTenantToFlat, bulkCreateFlats, bulkDeleteFlats, bulkUpdateStatus, createFlat, deleteFlat, filterFlats, getAllFlats, getAvailableFlats, getFlatById, getFlatsByApartment, getFlatsByTenant, getFlatStats, getRentDetails, markFlatAvailable, markFlatMaintenance, removeTenantFromFlat, restoreFlat, searchFlatByNumber, toggleFlatActiveStatus, transferTenant, updateFlat, updateMaintenanceCharge, updateRent } from "../controllers/flat.controller.js";
import { verifyEmail } from "../controllers/auth.controller.js";


const flatRouter = Router();


// Basic CRUD
flatRouter.post("/", verifyJWT, createFlat);              // Create
flatRouter.get("/", verifyJWT, getAllFlats);              // Get all
flatRouter.get("/:flatId", verifyJWT, getFlatById);       // Get one
flatRouter.patch("/:flatId", verifyJWT, updateFlat);      // Update
flatRouter.delete("/:flatId", verifyJWT, deleteFlat);     // Soft delete
flatRouter.patch("/:flatId/restore", verifyJWT, restoreFlat);


// TENANT MANAGEMENT
flatRouter.patch("/:flatId/assign-tenant", verifyJWT, assignTenantToFlat);
flatRouter.patch("/:flatId/remove-tenant", verifyJWT, removeTenantFromFlat);
flatRouter.patch("/transfer-tenant", verifyJWT, transferTenant);

// FILTER & SEARCH
flatRouter.get("/search", verifyJWT, searchFlatByNumber);
flatRouter.get("/filter", verifyJWT, filterFlats);
flatRouter.get("/available", verifyJWT, getAvailableFlats);


// RELATIONS
flatRouter.get("/tenant/:tenantId", verifyJWT, getFlatsByTenant);
flatRouter.get("/apartment/:apartmentId", verifyJWT, getFlatsByApartment);

// STATUS & STATE
flatRouter.patch("/:flatId/maintenance", verifyJWT, markFlatMaintenance);
flatRouter.patch("/:flatId/available", verifyJWT, markFlatAvailable);
flatRouter.patch("/:flatId/toggle-active", verifyJWT, toggleFlatActiveStatus);

// FINANCIAL
flatRouter.patch("/:flatId/rent", verifyJWT, updateRent);
flatRouter.patch("/:flatId/maintenance-charge", verifyJWT, updateMaintenanceCharge);
flatRouter.get("/:flatId/rent-details", verifyJWT, getRentDetails);

// ANALYTICS
flatRouter.get("/stats/overview", verifyJWT, getFlatStats);

// BULK OPERATIONS
flatRouter.post("/bulk", verifyJWT, bulkCreateFlats);
flatRouter.patch("/bulk/status", verifyJWT, bulkUpdateStatus);
flatRouter.delete("/bulk", verifyJWT, bulkDeleteFlats);



export default flatRouter;