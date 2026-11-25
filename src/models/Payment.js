import mongoose from "mongoose";

const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  documentNumber: { type: Number, required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, required: true, default: Date.now },
  paymentMethod: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"], required: true },
  referenceNumber: { type: String, trim: true, default: "" },
  notes: { type: String, trim: true, default: "" },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  emiFrequency: { type: String, enum: ["monthly"], default: "monthly" },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

export default mongoose.model("Payment", schema);