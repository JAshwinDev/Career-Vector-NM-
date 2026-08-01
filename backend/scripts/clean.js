const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
async function cleanDemoData() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const JobHistory = require('../models/JobHistory');
  const ResumeProfile = require('../models/ResumeProfile');
  
  const demoUsers = await User.find({ email: /demo\..*@example\.com/ });
  const demoIds = demoUsers.map(u => u._id.toString());
  
  await JobHistory.deleteMany({ userId: { $in: demoIds } });
  await ResumeProfile.deleteMany({ userId: { $in: demoIds } });
  await User.deleteMany({ _id: { $in: demoIds } });
  
  // also clean any history where userId is just 'demo' or empty, or where it's fake data
  // The user said: "there is one fake data in the peers". 
  // Let's delete any history that doesn't have a valid mongoose Object ID in userId.
  const allHistory = await JobHistory.find({});
  let deletedFake = 0;
  for (const h of allHistory) {
    if (!mongoose.Types.ObjectId.isValid(h.userId) && h.userId !== "") {
      await JobHistory.deleteOne({ _id: h._id });
      deletedFake++;
    }
  }

  console.log(`Cleaned up ${demoUsers.length} demo users and their history/profiles. Deleted ${deletedFake} fake history entries.`);
  process.exit(0);
}
cleanDemoData();
