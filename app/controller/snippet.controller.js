const SnippetModel = require('../models/snippet.model')
const GroupMemberModel = require('../models/group.member.model')
const StatusCode = require('../utils/StatusCode')

class SnippetController {

    // ─── CREATE SNIPPET ───────────────────────────────────────────────
    async createSnippet(req, res) {
        try {
            const requestPayload = {
                snippet_title: req.body.snippet_title,
                snippet_code: req.body.snippet_code,
                snippet_language: req.body.snippet_language,
                snippet_description: req.body.snippet_description || "",
                snippet_tags: req.body.snippet_tags || [],
                visibility: req.body.visibility || 'private'
            }

            if (!requestPayload.snippet_title || !requestPayload.snippet_code || !requestPayload.snippet_language) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "snippet_title, snippet_code and snippet_language are required"
                })
            }

            const allowedLanguages = ['js', 'ts', 'py', 'go', 'rs', 'java', 'cpp', 'bash', 'sql', 'php', 'rb', 'other']
            if (!allowedLanguages.includes(requestPayload.snippet_language)) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `snippet_language must be one of: ${allowedLanguages.join(', ')}`
                })
            }

            if (requestPayload.snippet_tags.length > 10) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Maximum 10 tags allowed"
                })
            }

            const snippet = new SnippetModel({
                created_by: req.user.id,
                snippet_title: requestPayload.snippet_title,
                snippet_code: requestPayload.snippet_code,
                snippet_language: requestPayload.snippet_language,
                snippet_description: requestPayload.snippet_description,
                snippet_tags: requestPayload.snippet_tags,
                visibility: requestPayload.visibility
            })

            await snippet.save()

            return res.status(StatusCode.CREATED).json({
                success: true,
                message: "Snippet created successfully",
                data: snippet
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to create snippet"
            })
        }
    }

    // ─── GET SINGLE SNIPPET ───────────────────────────────────────────
    async getSnippet(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })
                .populate('created_by', 'user_name user_email user_profile_image')

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // ── Access check ──────────────────────────────────────────
            // public → anyone can see
            // private → only the owner
            // group → only group members
            const canAccess = await checkSnippetAccess(snippet, req.user)
            if (!canAccess) {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "Access denied. This snippet is private."
                })
            }

            // Increment view count silently
            await SnippetModel.findByIdAndUpdate(id, { $inc: { view_count: 1 } })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Snippet fetched successfully",
                data: snippet
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to get snippet"
            })
        }
    }

    // ─── GET MY SNIPPETS ──────────────────────────────────────────────
    async getMySnippets(req, res) {
        try {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit

            const snippets = await SnippetModel.find({
                created_by: req.user.id,
                is_deleted: false
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)

            const total = await SnippetModel.countDocuments({
                created_by: req.user.id,
                is_deleted: false
            })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "My snippets fetched successfully",
                data: {
                    snippets,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to get snippets"
            })
        }
    }

    // ─── UPDATE SNIPPET ───────────────────────────────────────────────
    async updateSnippet(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // Only the owner can update
            if (snippet.created_by.toString() !== req.user.id) {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to update this snippet"
                })
            }

            const data = {}
            if (req.body.snippet_title) data.snippet_title = req.body.snippet_title
            if (req.body.snippet_code) data.snippet_code = req.body.snippet_code
            if (req.body.snippet_language) data.snippet_language = req.body.snippet_language
            if (req.body.snippet_description !== undefined) data.snippet_description = req.body.snippet_description
            if (req.body.snippet_tags) data.snippet_tags = req.body.snippet_tags
            if (req.body.visibility) data.visibility = req.body.visibility

            const updatedSnippet = await SnippetModel.findByIdAndUpdate(id, data, { new: true })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Snippet updated successfully",
                data: updatedSnippet
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to update snippet"
            })
        }
    }

    // ─── DELETE SNIPPET (soft delete) ─────────────────────────────────
    async deleteSnippet(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            // Owner or admin can delete
            if (snippet.created_by.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to delete this snippet"
                })
            }

            // Admin hard delete with ?force=true
            if (req.query.force === 'true' && req.user.role === 'admin') {
                await SnippetModel.findByIdAndDelete(id)
                return res.status(StatusCode.SUCCESS).json({
                    success: true,
                    message: "Snippet permanently deleted"
                })
            }

            // Soft delete for everyone else
            await SnippetModel.findByIdAndUpdate(id, { is_deleted: true })

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Snippet deleted successfully"
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to delete snippet"
            })
        }
    }

    // ─── TOGGLE VISIBILITY (private ↔ public) ─────────────────────────
    async toggleVisibility(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            if (snippet.created_by.toString() !== req.user.id) {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to change this snippet's visibility"
                })
            }

            const newVisibility = snippet.visibility === 'public' ? 'private' : 'public'

            const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                id,
                { visibility: newVisibility },
                { new: true }
            )

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: `Snippet is now ${newVisibility}`,
                data: {
                    visibility: updatedSnippet.visibility
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to toggle visibility"
            })
        }
    }

    // ─── PUBLISH SNIPPET (private/group → public permanently) ─────────
    async publishSnippet(req, res) {
        try {
            const { id } = req.params

            const snippet = await SnippetModel.findOne({ _id: id, is_deleted: false })

            if (!snippet) {
                return res.status(StatusCode.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found"
                })
            }

            if (snippet.created_by.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(StatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not authorized to publish this snippet"
                })
            }

            if (snippet.visibility === 'public') {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Snippet is already public"
                })
            }

            const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                id,
                {
                    visibility: 'public',
                    published_at: new Date(),
                    group_id: null  // remove group scope when publishing
                },
                { new: true }
            )

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Snippet published to public feed successfully",
                data: updatedSnippet
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to publish snippet"
            })
        }
    }

    // ─── PUBLIC FEED ──────────────────────────────────────────────────
    async getPublicFeed(req, res) {
        try {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit
            const sort = req.query.sort === 'newest' ? { createdAt: -1 } : { vote_score: -1 }

            const filter = { visibility: 'public', is_deleted: false }
            if (req.query.lang) filter.snippet_language = req.query.lang
            if (req.query.tag) filter.snippet_tags = { $in: [req.query.tag] }

            const snippets = await SnippetModel.find(filter)
                .populate('created_by', 'user_name user_profile_image')
                .sort(sort)
                .skip(skip)
                .limit(limit)

            const total = await SnippetModel.countDocuments(filter)

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Public feed fetched successfully",
                data: {
                    snippets,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to get public feed"
            })
        }
    }

    // ─── SEARCH SNIPPETS ──────────────────────────────────────────────
    async searchSnippets(req, res) {
        try {
            const { q } = req.query

            if (!q) {
                return res.status(StatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Search query q is required"
                })
            }

            const filter = {
                $text: { $search: q },
                visibility: 'public',
                is_deleted: false
            }

            if (req.query.lang) filter.snippet_language = req.query.lang
            if (req.query.tag) filter.snippet_tags = { $in: [req.query.tag] }

            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 20
            const skip = (page - 1) * limit

            const snippets = await SnippetModel.find(filter, { score: { $meta: 'textScore' } })
                .populate('created_by', 'user_name user_profile_image')
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit)

            const total = await SnippetModel.countDocuments(filter)

            return res.status(StatusCode.SUCCESS).json({
                success: true,
                message: "Search results fetched successfully",
                data: {
                    snippets,
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            })

        } catch (err) {
            console.error(err)
            return res.status(StatusCode.SERVER_ERROR).json({
                success: false,
                message: "Failed to search snippets"
            })
        }
    }
}

// ─── HELPER: Access check (used in getSnippet) ────────────────────────
async function checkSnippetAccess(snippet, user) {
    // Public snippets — anyone can access
    if (snippet.visibility === 'public') return true

    // No user token — deny
    if (!user) return false

    // Owner always has access
    if (snippet.created_by._id.toString() === user.id) return true

    // Group snippet — check membership
    if (snippet.group_id) {
        const member = await GroupMemberModel.findOne({
            group_id: snippet.group_id,
            user_id: user.id
        })
        return !!member
    }

    return false
}

module.exports = new SnippetController()