import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch conversations between two specific users ordered by time
messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });
messageSchema.index({ receiver: 1, sender: 1, timestamp: 1 });

messageSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
