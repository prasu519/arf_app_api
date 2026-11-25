import { Router } from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Payment from "../models/Payment.js";

const router = Router();

// Business rule: payment reduces ONLY totalPendingAmount.
// EMI/overdue breakdown fields are intentionally not recalculated.
router.post("/", async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { customerId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
    const paid = Number(amount);
    if (!mongoose.isValidObjectId(customerId)) return res.status(400).json({ success: false, message: "Valid customerId is required" });
    if (!Number.isFinite(paid) || paid <= 0) return res.status(400).json({ success: false, message: "Payment amount must be greater than zero" });
    const methods = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
    if (!methods.includes(paymentMethod)) return res.status(400).json({ success: false, message: "Select a valid payment method" });
    const date = paymentDate ? new Date(paymentDate) : new Date();
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid payment date" });

    let payment;
    await session.withTransaction(async () => {
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) { const e = new Error("Customer not found"); e.status = 404; throw e; }

      const before = Number(customer.totalPendingAmount);
      if (paid > before) { const e = new Error(`Payment exceeds pending balance of ₹${before.toFixed(2)}`); e.status = 400; throw e; }

      const after = Number((before - paid).toFixed(2));
      customer.totalPendingAmount = after;
      customer.updatedAt = new Date();
      await customer.save({ session });

      [payment] = await Payment.create([{
        customer: customer._id,
        documentNumber: customer.documentNumber,
        amount: paid,
        paymentDate: date,
        paymentMethod,
        referenceNumber: referenceNumber || "",
        notes: notes || "",
        balanceBefore: before,
        balanceAfter: after,
        emiFrequency: "monthly"
      }], { session });
    });

    res.status(201).json({
      success: true,
      message: "Payment recorded. Only total pending amount was reduced.",
      data: payment
    });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.get("/customer/:customerId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.customerId)) return res.status(400).json({ success: false, message: "Invalid customer ID" });
    const data = await Payment.find({ customer: req.params.customerId }).sort({ paymentDate: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;