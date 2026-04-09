require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    await mongoose.connect(process.env.DB_CONNECTION || 'mongodb+srv://arnabsir001:9r2oY9s4nksmY7Z3@cluster0.o7f5t.mongodb.net/codeclan');
    const UserModel = require('./app/models/user.model');
    const SnippetModel = require('./app/models/snippet.model');

    console.log("Snippet Collection Name:", SnippetModel.collection.name);
    
    // Check snippet for test user
    const snippets = await SnippetModel.find({ visibility: 'public' });
    console.log("Public Snippets found:", snippets.length);
    if(snippets.length > 0) {
       console.log("Sample snippet created_by:", snippets[0].created_by, "is_deleted:", snippets[0].is_deleted);
    }
    
    const user = await UserModel.findOne({ user_name: 'izzon' });
    if (!user) return console.log("User not found");
    
    console.log("User ID:", user._id);

    const pipeline = [
        { $match: { user_name: 'izzon' } },
        {
            $lookup: {
                from: SnippetModel.collection.name,
                localField: '_id',
                foreignField: 'created_by',
                pipeline: [
                    { $match: { visibility: 'public' } }
                ],
                as: 'public_snippets'
            }
        }
    ];

    const aggregated = await UserModel.aggregate(pipeline);
    console.log("Aggregated Profile:", JSON.stringify(aggregated, null, 2));
    mongoose.disconnect();
}
test();
