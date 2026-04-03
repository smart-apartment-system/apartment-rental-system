import { asyncHandler } from "../utils/asyncHandler.js";
import Flat from "../models/Flat.model.js";
import Apartment from "../models/Apartment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";


// 1. Flat CRUD Controllers
export const createFlat = asyncHandler(async(req,res)=>{

    const {
        apartmentId,
        flatNumber,
        floor,
        type,
        baseRent,
        maintenanceCharge,
        securityDeposit,
    } = req.body;

    if (!apartmentId || !flatNumber || !floor || !type || !baseRent){
        throw new ApiError(400, "Required fields are missing");
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
        throw new ApiError(404, "Apartment not found");
    }

    const existingFlat = await Flat.findOne({
        apartmentId,
        flatNumber: flatNumber.toUpperCase(),
    });


    if (existingFlat) {
        throw new ApiError(400, "Flat already exists in this apartment");
    }

    const flat = await Flat.create({
        apartmentId,
        flatNumber,
        floor,
        type,
        baseRent,
        maintenanceCharge,
        securityDeposit,
    });

    return res.status(201).json(
        new ApiResponse(201, flat.toPublicJSON(), "Flat created successfully")
    );
});

export const getAllFlats = asyncHandler(async(req,res)=>{
    const { apartmentId, page = 1, limit = 10 } = req.query;
    if(!apartmentId){
        throw new ApiError(400, "Apartment ID is required");
    }

    const apartment = await Apartment.findById(apartmentId);
    if(!apartment){
        throw new ApiError(404,"Apartment not found");
    }

    const skip = (page - 1) * limit;
    const flats = await Flat.find({apartmentId})
        .populate("tenantId","name email")
        .sort({floor:1 , flatNumber: 1})
        .skip(skip)
        .limit(Number(limit));

    const total = await Flat.countDocuments({ apartmentId });
    return res.status(200).json(
        new ApiResponse(200,{
            flats: flats.map(f => f.toPublicJSON()),
            pagination:{
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        },"Flats fetched successfully")
    );
});

export const getFlatById = asyncHandler(async(req,res)=>{

});

export const updateFlat = asyncHandler(async(req,res)=>{

});

export const deleteFlat = asyncHandler(async(req,res)=>{

});

// 2. Occupancy / Tenant Controllers
export const assignTenantToFlat = asyncHandler(async(req,res)=>{

});

export const removeTenantFromFlat = asyncHandler(async(req,res)=>{

});

// (flat A → flat B)
export const transferTenant = asyncHandler(async(req,res)=>{

});

export const getFlatsByTenant = asyncHandler(async(req,res)=>{

});

// 3. Filtering / Search Controllers

export const getFlatsByApartment = asyncHandler(async(req,res)=>{

});

export const getAvailableFlats = asyncHandler(async(req,res)=>{

});

export const getOccupiedFlats = asyncHandler(async(req,res)=>{

});

// filterFlats (floor, type, rent range)
export const filterFlats = asyncHandler(async(req,res)=>{

});

export const searchFlatByNumber = asyncHandler(async(req,res)=>{

});

// 4. Status Management Controllers

export const markFlatMaintenance = asyncHandler(async(req,res)=>{

});

export const markFlatAvailable = asyncHandler(async(req,res)=>{

});

export const toggleFlatActiveStatus = asyncHandler(async(req,res)=>{

});

// 5. Financial Controllers
export const updateRent = asyncHandler(async(req,res)=>{

});

export const updateMaintenanceCharge = asyncHandler(async(req,res)=>{

});

export const getRentDetails = asyncHandler(async(req,res)=>{

});

// 6. Admin Dashboard Controllers

// getFlatStats
// // returns:
// {
//   totalFlats,
//   occupied,
//   vacant,
//   maintenance
// }
export const getFlatStats = asyncHandler(async(req,res)=>{

});

// 7. Bulk Operations

export const bulkCreateFlats = asyncHandler(async(req,res)=>{

});

export const bulkDeleteFlats = asyncHandler(async(req,res)=>{

});

export const bulkUpdateStatus = asyncHandler(async(req,res)=>{

});