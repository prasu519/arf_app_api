import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    documentNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    area: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    agreementDate: {
      type: Date,
      required: true,
    },

    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },

    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    tenure: {
      type: Number,
      required: true,
      min: 1,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    emiAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    emiStartDate: {
      type: Date,
      required: true,
    },

    currentMonthInstallment: {
      type: Number,
      required: true,
      min: 0,
    },

    overdueInstallment: {
      type: Number,
      required: true,
      min: 0,
    },

    openingOverdueAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currentMonthEmi: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPendingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    guarantorContactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    document: {
      fileName: {
        type: String,
      },
      filePath: {
        type: String,
      },
      mimeType: {
        type: String,
      },
      size: {
        type: Number,
      },
    },

    emiFrequency: {
      type: String,
      enum: ["monthly"],
      default: "monthly",
      immutable: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

schema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Customer", schema);
