const CommentModel = require('../models/comment.model')
const SnippetModel = require('../models/snippet.model')
const GroupMemberModel = require('../models/group.member.model')
const StatusCode = require('../utils/StatusCode')

class CommentController {

    // ─── ADD COMMENT OR REPLY ─────────────────────────────────────────
    // POST /api/comments
    // body: { snippet_id, comment_body, parent_id? }
    async addComment(req, res) {
        try {
            const { snippet_id, comment_body, parent_id } = req.body

            if (!snippet_id || !comment_body) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "snippet_id and comment_body are required"
                })
            }

            if (comment_body.length > 2000) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "comment_body must be 2000 characters or less"
                })
            }

            // Verify the snippet exists and user can access it
            const snippet = await SnippetModel.findOne({ _id: snippet_id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            const canAccess = await checkSnippetAccess(snippet, req.user)
            if (!canAccess) {
                return res.status(StatusCode.FORBIDDEN).json({
                    success: false,
                    message: "You do not have access to comment on this snippet"
                })
            }

            // If parent_id provided, verify it exists and belongs to same snippet
            if (parent_id) {
                const parentComment = await CommentModel.findOne({
                    _id: parent_id,
                    snippet_id,
                    is_deleted: false
                })
                if (!parentComment) {
                    return res.status(StatusCode.NOT_FOUND).json({
                        success: false,
                        message: "Parent comment not found"
                    })
                }
            }

            const comment = new CommentModel({
                snippet_id,
                author_id: req.user.id,
                parent_id: parent_id || null,
                comment_body
            })

            await comment.save()

            const populatedComment = await CommentModel.findById(comment._id)
                .populate('author_id', 'user_name user_profile_image')

            return res.status(StatusCode.CREATED).json({
                success: true,
                message: "Comment added successfully",
                data: populatedComment
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to add comment"
            })
        }
    }

    // ─── GET COMMENTS FOR A SNIPPET ───────────────────────────────────
    // GET /api/comments/:snippetId
    // Returns top-level comments; replies are nested under parent_id
    async getSnippetComments(req, res) {
        try {
            const { snippetId } = req.params
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit

            const snippet = await SnippetModel.findOne({ _id: snippetId, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // Access check (optionalAuth — req.user may be null for public snippets)
            const canAccess = await checkSnippetAccess(snippet, req.user)
            if (!canAccess) {
                return res.status(StatusCode.FORBIDDEN).json({
                    success: false,
                    message: "You do not have access to view comments on this snippet"
                })
            }

            // Fetch ALL non-deleted comments for this snippet
            const allComments = await CommentModel.find({
                snippet_id: snippetId,
                is_deleted: false
            })
                .populate('author_id', 'user_name user_profile_image')
                .sort({ createdAt: 1 })

            // Build threaded structure: group replies under their parent
            const commentMap = {}
            const topLevel = []

            allComments.forEach(c => {
                const obj = c.toObject()
                obj.replies = []
                commentMap[c._id.toString()] = obj
            })

            allComments.forEach(c => {
                if (c.parent_id) {
                    const parent = commentMap[c.parent_id.toString()]
                    if (parent) parent.replies.push(commentMap[c._id.toString()])
                } else {
                    topLevel.push(commentMap[c._id.toString()])
                }
            })

            // Paginate top-level comments only
            const paginatedTop = topLevel.slice(skip, skip + limit)
            const total = topLevel.length

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Comments fetched successfully",
                data: {
                    comments: paginatedTop,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to fetch comments"
            })
        }
    }

    // ─── UPDATE COMMENT ───────────────────────────────────────────────
    // PUT /api/comments/:id
    async updateComment(req, res) {
        try {
            const { id } = req.params
            const { comment_body } = req.body

            if (!comment_body) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "comment_body is required"
                })
            }

            if (comment_body.length > 2000) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "comment_body must be 2000 characters or less"
                })
            }

            const comment = await CommentModel.findOne({ _id: id, is_deleted: false })

            if (!comment) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Comment not found"
                })
            }

            // Only the author can edit their comment
            if (comment.author_id.toString() !== req.user.id) {
                return res.status(StatusCode.FORBIDDEN).json({
                    success: false,
                    message: "You are not authorized to edit this comment"
                })
            }

            const updatedComment = await CommentModel.findByIdAndUpdate(
                id,
                { comment_body },
                { new: true }
            ).populate('author_id', 'user_name user_profile_image')

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Comment updated successfully",
                data: updatedComment
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to update comment"
            })
        }
    }

    // ─── DELETE COMMENT (soft) ────────────────────────────────────────
    // DELETE /api/comments/:id
    async deleteComment(req, res) {
        try {
            const { id } = req.params

            const comment = await CommentModel.findOne({ _id: id, is_deleted: false })

            if (!comment) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Comment not found"
                })
            }

            // Owner of the comment or admin can delete
            if (comment.author_id.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(StatusCode.FORBIDDEN).json({
                    success: false,
                    message: "You are not authorized to delete this comment"
                })
            }

            await CommentModel.findByIdAndUpdate(id, { is_deleted: true })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Comment deleted successfully"
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to delete comment"
            })
        }
    }

}

// ─── HELPER: snippet access check (mirrors snippet.controller.js) ──────────
async function checkSnippetAccess(snippet, user) {
    if (snippet.visibility === 'public') return true
    if (!user) return false
    if (snippet.created_by.toString() === user.id) return true
    if (snippet.group_id) {
        const member = await GroupMemberModel.findOne({
            group_id: snippet.group_id,
            user_id: user.id
        })
        return !!member
    }
    return false
}

module.exports = new CommentController()
