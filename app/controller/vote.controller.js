const VoteModel = require('../models/vote.model')
const SnippetModel = require('../models/snippet.model')
const StatusCode = require('../utils/StatusCode')

class VoteController {

    // ─── CAST / TOGGLE VOTE ───────────────────────────────────────────
    // POST /api/snippets/:id/vote   body: { vote_value: 1 or -1 }
    //
    // Case A — No existing vote     → insert vote, +score by value
    // Case B — Same vote again      → remove vote (toggle off), -score by value
    // Case C — Opposite vote        → flip vote, adjust score by value × 2
    async castVote(req, res) {
        try {
            const { id } = req.params           // snippet id
            const { vote_value } = req.body     // 1 or -1

            if (vote_value !== 1 && vote_value !== -1) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "vote_value must be 1 (upvote) or -1 (downvote)"
                })
            }

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // Only public snippets can be voted on
            if (snippet.visibility !== 'public') {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "You can only vote on public snippets"
                })
            }

            const existingVote = await VoteModel.findOne({
                user_id: req.user.id,
                snippet_id: id
            })

            let newVoteScore
            let userVote

            if (!existingVote) {
                // ── Case A: No vote yet — insert new vote ──────────────
                await VoteModel.create({
                    user_id: req.user.id,
                    snippet_id: id,
                    vote_value: vote_value
                })

                const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                    id,
                    { $inc: { vote_score: vote_value } },
                    { new: true }
                )

                newVoteScore = updatedSnippet.vote_score
                userVote = vote_value

            } else if (existingVote.vote_value === vote_value) {
                // ── Case B: Same vote — toggle off (remove vote) ───────
                await VoteModel.findByIdAndDelete(existingVote._id)

                const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                    id,
                    { $inc: { vote_score: -vote_value } },
                    { new: true }
                )

                newVoteScore = updatedSnippet.vote_score
                userVote = null

            } else {
                // ── Case C: Opposite vote — flip direction ─────────────
                await VoteModel.findByIdAndUpdate(existingVote._id, { vote_value: vote_value })

                const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                    id,
                    { $inc: { vote_score: vote_value * 2 } },
                    { new: true }
                )

                newVoteScore = updatedSnippet.vote_score
                userVote = vote_value
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: userVote === null ? "Vote removed" : vote_value === 1 ? "Upvoted successfully" : "Downvoted successfully",
                data: {
                    vote_score: newVoteScore,
                    user_vote: userVote
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to cast vote"
            })
        }
    }

    // ─── GET VOTE STATUS (did I vote on this snippet?) ────────────────
    async getVoteStatus(req, res) {
        try {
            const { id } = req.params

            const existingVote = await VoteModel.findOne({
                user_id: req.user.id,
                snippet_id: id
            })

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false }, 'vote_score')

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Vote status fetched",
                data: {
                    vote_score: snippet.vote_score,
                    user_vote: existingVote ? existingVote.vote_value : null
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to get vote status"
            })
        }
    }

}

module.exports = new VoteController()