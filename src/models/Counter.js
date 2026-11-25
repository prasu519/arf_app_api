import mongoose from "mongoose";

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 1000 }
}, { versionKey: false });

export default mongoose.model("Counter", schema);