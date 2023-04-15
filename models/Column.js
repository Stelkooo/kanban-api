const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const columnSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  board: { type: ObjectId, ref: 'Board', required: true },
  tasks: [{ type: ObjectId, ref: 'Task' }],
});

module.exports = mongoose.model('Column', columnSchema);
