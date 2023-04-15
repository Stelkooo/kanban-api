const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const subtaskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    required: true,
    default: false,
  },
  task: {
    type: ObjectId,
    ref: 'Task',
    required: true,
  },
});

module.exports = mongoose.model('Subtask', subtaskSchema);
