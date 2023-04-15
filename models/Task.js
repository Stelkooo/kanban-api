const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const taskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  column: { type: ObjectId, ref: 'Column', required: true },
  subtasks: [{ type: ObjectId, ref: 'Subtask', required: true }],
});

module.exports = mongoose.model('Task', taskSchema);
