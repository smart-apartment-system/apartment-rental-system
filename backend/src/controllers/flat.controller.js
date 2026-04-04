import { asyncHandler } from "../utils/asyncHandler.js";
import Flat from "../models/Flat.model.js";
import User from "../models/User.model.js"
import Apartment from "../models/Apartment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";


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
    const {flatId} = req.params;
    if(!flatId){
        throw new ApiError(400, "Flat id is required");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404, "Flat not found");
    }

    return res.status(200).json(
        new ApiResponse(200, flat.toPublicJSON(), "Flat fetched successfully")
    );
});

export const updateFlat = asyncHandler(async(req,res)=>{
    const { flatId } = req.params;
    const { baseRent, maintenanceCharge, securityDeposit } = req.body;

    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404, "Flat not found");
    }

    if (baseRent !== undefined) flat.baseRent = baseRent;
    if (maintenanceCharge !== undefined) flat.maintenanceCharge = maintenanceCharge;
    if (securityDeposit !== undefined) flat.securityDeposit = securityDeposit;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(200, flat.toPublicJSON(), "Flat updated  successfully")
    );
});

export const deleteFlat = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }
    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404, "Flat not found");
    }
    flat.deletedAt = new Date();
    flat.isActive = false;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Flat deleted successfully")
    );
});

export const restoreFlat = asyncHandler(async (req, res) => {
    const { flatId } = req.params;

    const flat = await Flat.findByIdAndUpdate(
        flatId,
        { deletedAt: null, isActive: true },
        { new: true }
    );

    if (!flat) throw new ApiError(404, "Flat not found");

    return res.status(200).json(
        new ApiResponse(200, flat, "Flat restored successfully")
    );
});

// 2. Occupancy / Tenant Controllers
export const assignTenantToFlat = asyncHandler(async(req,res)=>{
    const { flatId } = req.params;
    const { tenantId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        throw new ApiError(400, "Invalid Tenant ID");
    }

    const flat = await Flat.findById(flatId);
    if (!flat) {
        throw new ApiError(404, "Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }

    if (flat.isOccupied) {
        throw new ApiError(400, "Flat is already occupied");
    }

    if (flat.status === "maintenance") {
        throw new ApiError(400, "Flat is under maintenance");
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    const existingFlat = await Flat.findOne({ tenantId });

    if (existingFlat) {
        throw new ApiError(400, "Tenant is already assigned to another flat");
    }

    flat.tenantId = tenantId;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            "Tenant assigned successfully"
        )
    );

});

export const removeTenantFromFlat = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    const {tenantId} = req.body;

    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        throw new ApiError(400, "Invalid Tenant ID");
    }

    const flat = await Flat.findById(flatId);
    if (!flat) {
        throw new ApiError(404, "Flat not found");
    }

    if (!flat.isOccupied) {
        throw new ApiError(400, "Flat is not occupied");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }

    if (!flat.tenantId || flat.tenantId.toString() !== tenantId) {
        throw new ApiError(400, "Tenant is not assigned to this flat");
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    flat.tenantId = null;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            "Tenant removed successfully"
        )
    );

});

// (flat A → flat B)
export const transferTenant = asyncHandler(async(req,res)=>{
    const {fromFlatId} = req.params;
    const{toFlatId} = req.body;

    if (!mongoose.Types.ObjectId.isValid(fromFlatId)) {
        throw new ApiError(400, "Invalid from flat ID");
    }

    if (!mongoose.Types.ObjectId.isValid(toFlatIdFlatId)) {
        throw new ApiError(400, "Invalid to flat ID");
    }

    if (fromFlatId === toFlatId) {
        throw new ApiError(400, "Cannot transfer to same flat");
    }

    const fromFlat = await Flat.findById(fromFlatId);
    if(!fromFlat){
        throw new ApiError(404, " from Flat not found ");
    }

    const toFlat = await Flat.findById(toFlatId);
    if(!toFlat){
        throw new ApiError(404, "To flat not found");
    }

    if (fromFlat.deletedAt || toFlat.deletedAt) {
        throw new ApiError(400, "One of the flats is deleted");
    }

    if (!fromFlat.isOccupied) {
        throw new ApiError(400, "Source flat is not occupied");
    }
    const tenantId = fromFlat.tenantId;
    if (toFlat.isOccupied) {
        throw new ApiError(400, "Target flat is already occupied");
    }
    if (toFlat.status === "maintenance") {
        throw new ApiError(400, "Target flat is under maintenance");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        fromFlat.tenantId = null;
        await fromFlat.save({ session });

        // assign to target
        toFlat.tenantId = tenantId;
        await toFlat.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    fromFlat: fromFlat.toPublicJSON(),
                    toFlat: toFlat.toPublicJSON(),
                },
                "Tenant transferred successfully"
            )
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const getFlatsByTenant = asyncHandler(async(req,res)=>{
    const {tenantId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
        throw new ApiError(400, "Invalid Tenant ID");
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    const flats = await Flat.find({ tenantId });
    if (!flats || flats.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], "No flats found for this tenant")
        );
    }

    const formattedFlats = flats.map(flat => flat.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(
            200,
            formattedFlats,
            "Flats fetched successfully"
        )
    );
});

// 3. Filtering / Search Controllers

export const getFlatsByApartment = asyncHandler(async(req,res)=>{
    const {apartmentId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }

    const apartment = await Apartment.findById(apartmentId);
    if(!apartment){
        throw new ApiError(404,"Apartment Not Found");
    }

    const flats = await Flat.find({apartmentId});
    if (!flats || flats.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, [], "No flats found for this Apartment")
        );
    }

    const formattedFlats = flats.map(flat => flat.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(
            200,
            formattedFlats,
            "Flats fetched successfully"
        )
    );
});

export const getAvailableFlats = asyncHandler(async(req,res)=>{
    const {
        apartmentId,
        type,
        minRent,
        maxRent,
        page = 1,
        limit = 10
    } = req.query;
    if (apartmentId && !mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }

    const query = {
        isOccupied: false,
        status: "available"
    };

    if (apartmentId) {
        query.apartmentId = apartmentId;
    }

    if (type) {
        query.type = type;
    }

    if (minRent || maxRent) {
        query.baseRent = {};

        if (minRent) query.baseRent.$gte = Number(minRent);
        if (maxRent) query.baseRent.$lte = Number(maxRent);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const skip = (pageNum - 1) * limitNum;

    const flats = await Flat.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

    
    const formattedFlats = flats.map(flat => flat.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                flats: formattedFlats,
                page: pageNum,
                limit: limitNum,
                count: formattedFlats.length
            },
            "Available flats fetched successfully"
        )
    );

});



// filterFlats (floor, type, rent range)
export const filterFlats = asyncHandler(async(req,res)=>{
    const { 
        apartmentId,
        type,
        status,
        isOccupied,
        minRent,
        maxRent,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        order = "desc"
    } = req.query;

    if (apartmentId && !mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }
    
    const query ={};
    if (apartmentId) query.apartmentId = apartmentId;
    if (type) query.type = type;
    if (status) query.status = status;

    if (isOccupied !== undefined){
        query.isOccupied = isOccupied === "true";
    }

    if (minRent || maxRent) {
        query.baseRent = {};

        if (minRent) query.baseRent.$gte = Number(minRent);
        if (maxRent) query.baseRent.$lte = Number(maxRent);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {
        [sortBy]: order === "asc" ? 1 : -1
    };

    const flats = await Flat.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    const total = await Flat.countDocuments(query);

    const formattedFlats = flats.map(flat => flat.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                flats: formattedFlats,
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            },
            "Flats filtered successfully"
        )
    );
});

// export const searchFlatByNumber = asyncHandler(async(req,res)=>{
//     const {flatNumber} = req.query;
//     if(!flatNumber){
//         throw new ApiError(400,"Flat Number is required");
//     }
//     const normalizedFlatNumber = flatNumber.trim().toUpperCase();
//     const flat = await Flat.findOne({
//         flatNumber: normalizedFlatNumber
//     });
//     if(!flat){
//         throw new ApiError(404, "Flat not found");
//     }

//     return res.status(200).json(
//         new ApiResponse(
//             200,
//             flatNumber.toPublicJSON(),
//             "Flat fetched successfully"
//         )
//     )
// });

// 4. Status Management Controllers

export const searchFlatByNumber = asyncHandler(async (req, res) => {
    const { flatNumber } = req.query;

    if (!flatNumber) {
        throw new ApiError(400, "Flat number is required");
    }

    const flats = await Flat.find({
        flatNumber: { $regex: flatNumber.trim(), $options: "i" }
    });

    if (flats.length === 0) {
        throw new ApiError(404, "No flats found");
    }

    const formatted = flats.map(flat => flat.toPublicJSON());

    return res.status(200).json(
        new ApiResponse(
            200,
            formatted,
            "Flats fetched successfully"
        )
    );
});

export const markFlatMaintenance = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
        throw new ApiError(400, "Invalid Flat ID");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }
    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }
    if (flat.isOccupied) {
        throw new ApiError(400, "Cannot mark occupied flat as maintenance");
    }
    
    flat.status = "maintenance";
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            "Flats mark as maintenance successfully"
        )
    );
});

export const markFlatAvailable = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    if(!mongoose.Types.ObjectId.isValid(flatId)){
        throw new ApiError(400,"Flat id is not valid");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }
    if (flat.isOccupied || flat.tenantId) {
        throw new ApiError(400, "Cannot mark occupied flat as available");
    }
    if (flat.status === "available") {
        throw new ApiError(400, "Flat is already available");
    }
    flat.status = "available";
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            "Flat marked as available successfully"
        )
    );
    
});

export const toggleFlatActiveStatus = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    if(!mongoose.Types.ObjectId.isValid(flatId)){
        throw new ApiError(400,"Flat id is not valid");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }

    if (flat.isActive && flat.isOccupied) {
        throw new ApiError(400, "Cannot deactivate an occupied flat");
    }

    flat.isActive = !flat.isActive;
    await flat.save();
    const action = flat.isActive ? "activated" : "deactivated";

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            `Flat ${action} successfully`
        )
    );
    
});

// 5. Financial Controllers
export const updateRent = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    const {baseRent} = req.body;

    if(!mongoose.Types.ObjectId.isValid(flatId)){
        throw new ApiError(400,"Flat id is not valid");
    }

    if (baseRent === undefined || baseRent < 0) {
        throw new ApiError(400, "Valid base rent is required");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }
    // if (flat.isOccupied) {
    //     throw new ApiError(400, "Cannot update rent of occupied flat");
    // }
    if (flat.baseRent === baseRent) {
        throw new ApiError(400, "Rent is already the same");
    }

    flat.baseRent = baseRent;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            `Flat rent updated successfully`
        )
    );    
});

export const updateMaintenanceCharge = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    const {maintenanceCharge} = req.body;

    if(!mongoose.Types.ObjectId.isValid(flatId)){
        throw new ApiError(400,"Flat id is not valid");
    }

    const charge = Number(maintenanceCharge);

    if (isNaN(charge) || charge < 0) {
        throw new ApiError(400, "Valid maintenance charge is required");
    }

    const flat = await Flat.findById(flatId);
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }
    if (flat.maintenanceCharge === charge) {
        throw new ApiError(400, "Maintenance Charge is already the same");
    }

    flat.maintenanceCharge = charge;
    await flat.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            flat.toPublicJSON(),
            `Flat maintenance charge updated successfully`
        )
    );  
});

export const getRentDetails = asyncHandler(async(req,res)=>{
    const {flatId} = req.params;
    if(!mongoose.Types.ObjectId.isValid(flatId)){
        throw new ApiError(400,"Flat id is not valid");
    }

    const flat = await Flat.findById(flatId).populate("tenantId", "name email");;
    if(!flat){
        throw new ApiError(404,"Flat not found");
    }

    if (flat.deletedAt !== null) {
        throw new ApiError(400, "Flat is deleted");
    }

    const rentDetails = {
        flatId: flat._id,
        flatNumber: flat.flatNumber,
        baseRent: flat.baseRent,
        maintenanceCharge: flat.maintenanceCharge,
        totalRent: flat.totalRent,
        status: flat.status,
        isOccupied: flat.isOccupied,
        tenant: flat.tenantId || null
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            rentDetails,
            "Rent details fetched successfully"
        )
    );
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
    const { apartmentId } = req.query;
    if (apartmentId && !mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }

    const query = {};

    if (apartmentId) {
        query.apartmentId = apartmentId;
    }

    const [
        totalFlats,
        availableFlats,
        occupiedFlats,
        maintenanceFlats,
        inactiveFlats
    ] = await Promise.all([
        Flat.countDocuments(query),
        Flat.countDocuments({ ...query, status: "available" }),
        Flat.countDocuments({ ...query, isOccupied: true }),
        Flat.countDocuments({ ...query, status: "maintenance" }),
        Flat.countDocuments({ ...query, isActive: false })
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalFlats,
                availableFlats,
                occupiedFlats,
                maintenanceFlats,
                inactiveFlats
            },
            "Flat statistics fetched successfully"
        )
    );
});

// 7. Bulk Operations

export const bulkCreateFlats = asyncHandler(async(req,res)=>{
    const { apartmentId, flats } = req.body;
    if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        throw new ApiError(400, "Invalid Apartment ID");
    }

    if (!Array.isArray(flats) || flats.length === 0) {
        throw new ApiError(400, "Flats array is required");
    }

    const apartment = await Apartment.findById(apartmentId);
    if (!apartment) {
        throw new ApiError(404, "Apartment not found");
    }

    const formattedFlats = flats.map((flat) => {
        if (!flat.flatNumber || !flat.floor || !flat.type || flat.baseRent === undefined) {
            throw new ApiError(400, "Invalid flat data");
        }

        return {
            apartmentId,
            flatNumber: flat.flatNumber.trim().toUpperCase(),
            floor: flat.floor,
            type: flat.type,
            baseRent: flat.baseRent,
            maintenanceCharge: flat.maintenanceCharge || 0,
            securityDeposit: flat.securityDeposit || 0
        };
    });

    const flatNumbers = formattedFlats.map(f => f.flatNumber);
    const uniqueFlatNumbers = new Set(flatNumbers);

    if (flatNumbers.length !== uniqueFlatNumbers.size) {
        throw new ApiError(400, "Duplicate flat numbers in request");
    }

    const existingFlats = await Flat.find({
        apartmentId,
        flatNumber: { $in: flatNumbers }
    });

    if (existingFlats.length > 0) {
        throw new ApiError(400, "Some flats already exist in this apartment");
    }

    const createdFlats = await Flat.insertMany(formattedFlats);

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                count: createdFlats.length,
                flats: createdFlats.map(f => f.toPublicJSON())
            },
            "Flats created successfully"
        )
    );
});

export const bulkDeleteFlats = asyncHandler(async(req,res)=>{
    const { flatIds } = req.body;
    if (!Array.isArray(flatIds) || flatIds.length === 0) {
        throw new ApiError(400, "flatIds must be a non-empty array");
    }

    const invalidIds = flatIds.filter(
        id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
        throw new ApiError(400, "Some flat IDs are invalid");
    }

    const flats = await Flat.find({ _id: { $in: flatIds } });

    if (flats.length === 0) {
        throw new ApiError(404, "No flats found");
    }

    const deletableFlats = flats.filter(flat => {
        return (
            flat.deletedAt === null &&
            !flat.isOccupied
        );
    });

    const deletableIds = deletableFlats.map(flat => flat._id);

    if (deletableIds.length === 0) {
        throw new ApiError(400, "No flats can be deleted");
    }

    await Flat.updateMany(
        { _id: { $in: deletableIds } },
        {
            deletedAt: new Date(),
            isActive: false
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedCount: deletableIds.length,
                skippedCount: flatIds.length - deletableIds.length
            },
            "Flats deleted successfully"
        )
    );
});

export const bulkUpdateStatus = asyncHandler(async(req,res)=>{
    const { flatIds, status } = req.body;

    const allowedStatus = ["available", "occupied", "maintenance"];

    if (!Array.isArray(flatIds) || flatIds.length === 0) {
        throw new ApiError(400, "flatIds must be a non-empty array");
    }

    if (!allowedStatus.includes(status)) {
        throw new ApiError(400, "Invalid status value");
    }

    if (status === "occupied") {
        throw new ApiError(400, "Cannot manually set status to occupied");
    }

    const invalidIds = flatIds.filter(
        id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
        throw new ApiError(400, "Some flat IDs are invalid");
    }

    const flats = await Flat.find({ _id: { $in: flatIds } });

    if (flats.length === 0) {
        throw new ApiError(404, "No flats found");
    }

    const validFlats = flats.filter(flat => {
        if (flat.deletedAt !== null) return false;

        if (status === "available" && flat.isOccupied) return false;

        if (status === "maintenance" && flat.isOccupied) return false;

        return true;
    });

    const validIds = validFlats.map(f => f._id);

     if (validIds.length === 0) {
        throw new ApiError(400, "No flats eligible for update");
    }

    await Flat.updateMany(
        { _id: { $in: validIds } },
        { status }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedCount: validIds.length,
                skippedCount: flatIds.length - validIds.length
            },
            "Flat statuses updated successfully"
        )
    );
});