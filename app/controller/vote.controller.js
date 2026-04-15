const VoteModel = require('../models/vote.model')
const SnippetModel = require('../models/snippet.model')
const GroupMemberModel = require('../models/group.member.model')
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
            const { vote } = req.body           // 'up', 'down', or 'none'

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // ── Access Check ──
            const canVote = await checkVoteAccess(snippet, req.user)
            if (!canVote) {
                return res.status(StatusCode.FORBIDDEN).json({
                    success: false,
                    message: "You do not have permission to vote on this snippet."
                })
            }

            const existingVote = await VoteModel.findOne({
                user_id: req.user.id,
                snippet_id: id
            })

            let newVoteScore = snippet.vote_score
            let finalVote = 'none'

            if (vote === 'none') {
                if (existingVote) {
                    await VoteModel.findByIdAndDelete(existingVote._id)
                    const updated = await SnippetModel.findByIdAndUpdate(
                        id,
                        { $inc: { vote_score: -existingVote.vote_value } },
                        { new: true }
                    )
                    newVoteScore = updated.vote_score
                }
                finalVote = 'none'
            } else {
                const vote_value = vote === 'up' ? 1 : -1

                if (!existingVote) {
                    await VoteModel.create({
                        user_id: req.user.id,
                        snippet_id: id,
                        vote_value
                    })
                    const updated = await SnippetModel.findByIdAndUpdate(
                        id,
                        { $inc: { vote_score: vote_value } },
                        { new: true }
                    )
                    newVoteScore = updated.vote_score
                    finalVote = vote
                } else if (existingVote.vote_value === vote_value) {
                    // Toggle off
                    await VoteModel.findByIdAndDelete(existingVote._id)
                    const updated = await SnippetModel.findByIdAndUpdate(
                        id,
                        { $inc: { vote_score: -vote_value } },
                        { new: true }
                    )
                    newVoteScore = updated.vote_score
                    finalVote = 'none'
                } else {
                    // Change vote
                    await VoteModel.findByIdAndUpdate(existingVote._id, { vote_value })
                    const updated = await SnippetModel.findByIdAndUpdate(
                        id,
                        { $inc: { vote_score: vote_value * 2 } },
                        { new: true }
                    )
                    newVoteScore = updated.vote_score
                    finalVote = vote
                }
            }

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Vote cast successfully",
                data: {
                    vote_score: newVoteScore,
                    vote: finalVote
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
                    vote: existingVote ? (existingVote.vote_value === 1 ? 'up' : 'down') : 'none'
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

async function checkVoteAccess(snippet, user) {
    if (snippet.visibility === 'public') return true
    if (!user) return false
    
    // Owner of the snippet
    if (snippet.created_by.toString() === user.id) return true

    // Group member check
    if (snippet.group_id) {
        const member = await GroupMemberModel.findOne({
            group_id: snippet.group_id,
            user_id: user.id
        })
        return !!member
    }

    return false
}

module.exports = new VoteController()