import { Router } from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Payment from "../models/Payment.js";

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads/customer-documents");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${randomUUID()}.pdf`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const isPDF =
      file.mimetype === "application/pdf" &&
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPDF) {
      return cb(new Error("Only PDF files are allowed."));
    }

    cb(null, true);
  },
});

function deleteUploadedFile(file) {
  if (file?.path) {
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error("PDF cleanup error:", err.message);
      }
    });
  }
}

const required = [
  "documentNumber",
  "name",
  "area",
  "contactNumber",
  "agreementDate",
  "vehicleType",
  "vehicleNumber",
  "tenure",
  "dueDate",
  "emiAmount",
  "emiStartDate",
  "currentMonthInstallment",
  "overdueInstallment",
  "openingOverdueAmount",
  "currentMonthEmi",
  "totalPendingAmount",
  "guarantorContactNumber",
];

const numeric = [
  "documentNumber",
  "tenure",
  "emiAmount",
  "currentMonthInstallment",
  "overdueInstallment",
  "openingOverdueAmount",
  "currentMonthEmi",
  "totalPendingAmount",
];

function validate(body) {
  const errors = [];

  // REQUIRED FIELD VALIDATION
  for (const key of required) {
    if (
      body[key] === undefined ||
      body[key] === null ||
      String(body[key]).trim() === ""
    ) {
      errors.push(`${key} is required`);
    }
  }

  // NUMERIC VALIDATION
  for (const key of numeric) {
    if (
      body[key] !== undefined &&
      (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0)
    ) {
      errors.push(`${key} must be a non-negative number`);
    }
  }

  // DOCUMENT NUMBER VALIDATION
  if (
    body.documentNumber !== undefined &&
    (!Number.isInteger(Number(body.documentNumber)) ||
      Number(body.documentNumber) < 1)
  ) {
    errors.push("documentNumber must be a positive integer");
  }

  // TENURE VALIDATION
  if (
    body.tenure !== undefined &&
    (!Number.isInteger(Number(body.tenure)) || Number(body.tenure) < 1)
  ) {
    errors.push("tenure must be a positive integer");
  }

  // DATE VALIDATION
  for (const key of ["agreementDate", "emiStartDate", "dueDate"]) {
    if (body[key]) {
      const value = String(body[key]);
      const date = new Date(`${value}T00:00:00.000Z`);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        errors.push(`${key} must be a valid date in YYYY-MM-DD format`);
      }
    }
  }

  return errors;
}

// REGISTER CUSTOMER
router.post("/", upload.single("document"), async (req, res, next) => {
  try {
    const errors = validate(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const payload = {
      ...req.body,

      documentNumber: Number(req.body.documentNumber),
      tenure: Number(req.body.tenure),
      emiAmount: Number(req.body.emiAmount),
      currentMonthInstallment: Number(req.body.currentMonthInstallment),
      overdueInstallment: Number(req.body.overdueInstallment),
      openingOverdueAmount: Number(req.body.openingOverdueAmount),
      currentMonthEmi: Number(req.body.currentMonthEmi),
      totalPendingAmount: Number(req.body.totalPendingAmount),

      contactNumber: String(req.body.contactNumber),
      guarantorContactNumber: String(req.body.guarantorContactNumber),

      emiFrequency: "monthly",

      // Uploaded PDF details
      document: req.file
        ? {
            fileName: req.file.originalname,
            filePath: `/uploads/customer-documents/${req.file.filename}`,
            mimeType: req.file.mimetype,
            size: req.file.size,
          }
        : undefined,
    };

    // Check whether document number already exists
    const existingCustomer = await Customer.findOne({
      documentNumber: payload.documentNumber,
    });

    if (existingCustomer) {
      deleteUploadedFile(req.file);

      return res.status(409).json({
        success: false,
        message: "This document number already exists.",
      });
    }

    const customer = await Customer.create(payload);

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: customer,
    });
  } catch (err) {
    deleteUploadedFile(req.file);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This document number already exists.",
      });
    }

    next(err);
  }
});

// SEARCH CUSTOMERS
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "20", 10))
    );

    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { area: { $regex: q, $options: "i" } },
            { vehicleNumber: { $regex: q, $options: "i" } },
            ...(/^\d+$/.test(q)
              ? [{ documentNumber: Number(q) }, { contactNumber: q }]
              : []),
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Customer.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET CUSTOMER DETAILS
router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(req.params.id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const payments = await Payment.find({
      customer: customer._id,
    })
      .sort({ paymentDate: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...customer,
        payments,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
