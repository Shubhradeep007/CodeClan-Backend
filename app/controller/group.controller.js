const group_model = require("../models/group.model");
const GroupMemberModel = require("../models/group.member.model");
const SnippetModel = require("../models/snippet.model");
const status_Code = require("../utils/StatusCode");
const { cloudinary } = require("../utils/cloud.imageupload");

const GROUP_MEMBER_CAP = parseInt(process.env.GROUP_MEMBER_CAP) || 50;

class groupModelcontroller {

    // ─── CREATE GROUP ──────────────────────────────────────────────────
    async createGroup(req, res) {
        try {
            const { group_name, group_description } = req.body;
            const owner_id = req.user.id;
            let Image_Url = req.file ? req.file.path : "default.png";

            const newGroup = await group_model.create({
                owner_id,
                group_name,
                group_description,
                group_avatar: Image_Url,
            });

            // Add owner as member automatically
            await GroupMemberModel.create({
                group_id: newGroup._id,
                user_id: req.user.id,
                member_role: "owner",
            });

            return res.status(status_Code.CREATED).json({
                success: true,
                message: "Group created successfully",
                data: newGroup,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── GET MY GROUPS ─────────────────────────────────────────────────
    async getmyGroup(req, res) {
        try {
            const user_id = req.user.id;
            const memberships = await GroupMemberModel.find({ user_id }).populate("group_id");
            const result = memberships.map((item) => item.group_id);

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "group found successfully",
                data: result,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── GET GROUP BY ID ───────────────────────────────────────────────
    async getGroupById(req, res) {
        try {
            const { id } = req.params;
            const group = await group_model.findById(id);

            if (!group) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Group not found",
                });
            }

            // Only members (or admin) can view group details
            const membership = await GroupMemberModel.findOne({
                group_id: id,
                user_id: req.user.id,
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You are not a member of this group",
                });
            }

            const members = await GroupMemberModel.find({ group_id: id })
                .populate("user_id", "user_name user_email user_profile_image");

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Group fetched successfully",
                data: { group, members },
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── UPDATE GROUP (owner only) ─────────────────────────────────────
    async updateGroup(req, res) {
        try {
            const { id } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id: id,
                user_id: req.user.id,
                member_role: "owner",
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Only the group owner can update group details",
                });
            }

            const group = await group_model.findById(id);
            if (!group) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Group not found",
                });
            }

            const data = {};
            if (req.body.group_name) data.group_name = req.body.group_name;
            if (req.body.group_description !== undefined) data.group_description = req.body.group_description;

            if (req.file) {
                if (group.group_avatar && group.group_avatar.startsWith("http")) {
                    const publicId = group.group_avatar.split("/").slice(-2).join("/").split(".")[0];
                    await cloudinary.uploader.destroy(publicId);
                }
                data.group_avatar = req.file.path;
            }

            const updatedGroup = await group_model.findByIdAndUpdate(id, data, { new: true });

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Group updated successfully",
                data: updatedGroup,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── ARCHIVE GROUP (owner only) ────────────────────────────────────
    async archiveGroup(req, res) {
        try {
            const { id } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id: id,
                user_id: req.user.id,
                member_role: "owner",
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Only the group owner can archive this group",
                });
            }

            const group = await group_model.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            );

            if (!group) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Group not found",
                });
            }

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Group archived successfully. Snippets retain their history.",
                data: group,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── GET GROUP SNIPPETS (members only) ────────────────────────────
    async getGroupSnippets(req, res) {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const membership = await GroupMemberModel.findOne({
                group_id: id,
                user_id: req.user.id,
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You are not a member of this group",
                });
            }

            const snippets = await SnippetModel.find({
                group_id: id,
                is_deleted: false,
                group_status: "approved"
            })
                .populate("created_by", "user_name user_profile_image")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await SnippetModel.countDocuments({ group_id: id, is_deleted: false });

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Group snippets fetched successfully",
                data: { snippets, total, page, totalPages: Math.ceil(total / limit) },
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── ASSIGN SNIPPET TO GROUP ──────────────────────────────────────
    async assignSnippetToGroup(req, res) {
        try {
            const { id: group_id, snippetId } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id,
                user_id: req.user.id,
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You are not a member of this group",
                });
            }

            let assignedStatus = "approved";
            if (membership && membership.member_role === "viewer") {
                assignedStatus = "pending";
            }

            const snippet = await SnippetModel.findOne({ _id: snippetId, is_deleted: false });

            if (!snippet) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Snippet not found",
                });
            }

            if (snippet.created_by.toString() !== req.user.id && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Only the snippet owner can assign it to a group",
                });
            }

            const updatedSnippet = await SnippetModel.findByIdAndUpdate(
                snippetId,
                { group_id, visibility: "group", group_status: assignedStatus },
                { new: true }
            );

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: assignedStatus === "pending" 
                    ? "Snippet submitted for approval successfully" 
                    : "Snippet assigned to group successfully",
                data: updatedSnippet,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── INVITE MEMBER (via invite code) ──────────────────────────────
    async inviteMember(req, res) {
        try {
            const { invite_code } = req.body;
            const group = await group_model.findOne({ invite_code });

            if (!group) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "Invalid invite code",
                });
            }

            if (!group.isActive) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "Group is not active",
                });
            }

            // Enforce member cap
            const memberCount = await GroupMemberModel.countDocuments({ group_id: group._id });
            if (memberCount >= GROUP_MEMBER_CAP) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: `Group is full. Maximum ${GROUP_MEMBER_CAP} members allowed.`,
                });
            }

            const checkMember = await GroupMemberModel.findOne({
                group_id: group._id,
                user_id: req.user.id,
            });

            if (checkMember) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "You are already a member of this group",
                });
            }

            const member = await GroupMemberModel.create({
                group_id: group._id,
                user_id: req.user.id,
                member_role: "viewer",
            });

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Joined group successfully",
                data: member,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── CHANGE MEMBER ROLE (owner only) ──────────────────────────────
    async Rolechenge(req, res) {
        try {
            const { group_id, user_id, new_role } = req.body;

            const curUser = await GroupMemberModel.findOne({
                user_id: req.user.id,
                group_id,
            });

            if (!curUser) {
                return res.status(status_Code.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not part of this group",
                });
            }

            if (curUser.member_role !== "owner") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Only the owner can change roles",
                });
            }

            const member = await GroupMemberModel.findOne({ group_id, user_id });

            if (!member) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Member not found",
                });
            }

            if (member.member_role === "owner") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Cannot change the owner's role",
                });
            }

            if (member.user_id.toString() === req.user.id) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "You cannot change your own role",
                });
            }

            if (new_role !== "editor" && new_role !== "viewer") {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "Role must be 'editor' or 'viewer'",
                });
            }

            member.member_role = new_role;
            await member.save();

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Role updated successfully",
                data: member,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── REMOVE MEMBER (owner only) ───────────────────────────────────
    async removeMember(req, res) {
        try {
            const { group_id, user_id } = req.body;

            const curUser = await GroupMemberModel.findOne({
                group_id,
                user_id: req.user.id,
            });

            if (!curUser) {
                return res.status(status_Code.UNAUTHORIZED).json({
                    success: false,
                    message: "You are not part of this group",
                });
            }

            if (curUser.member_role !== "owner") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Only the owner can remove members",
                });
            }

            const member = await GroupMemberModel.findOne({ group_id, user_id });

            if (!member) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Member not found",
                });
            }

            if (member.member_role === "owner") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "Cannot remove the group owner",
                });
            }

            if (member.user_id.toString() === req.user.id) {
                return res.status(status_Code.BAD_REQUEST).json({
                    success: false,
                    message: "You cannot remove yourself",
                });
            }

            await GroupMemberModel.deleteOne({ group_id, user_id });

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Member removed successfully",
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── GET PENDING GROUP SNIPPETS (owner/mod only) ──────────────────
    async getPendingGroupSnippets(req, res) {
        try {
            const { id } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id: id,
                user_id: req.user.id,
            });

            if (!membership && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You are not a member of this group",
                });
            }

            if (membership.member_role === "viewer" || membership.member_role === "member") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You do not have permission to view pending snippets",
                });
            }

            const snippets = await SnippetModel.find({
                group_id: id,
                is_deleted: false,
                group_status: "pending",
            })
                .populate("created_by", "user_name user_profile_image")
                .sort({ createdAt: -1 });

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Pending snippets fetched successfully",
                data: { snippets },
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                 success: false,
                 message: error.message,
            });
        }
    }

    // ─── APPROVE SNIPPET (owner/mod only) ─────────────────────────────
    async approveGroupSnippet(req, res) {
        try {
            const { id: group_id, snippetId } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id,
                user_id: req.user.id,
            });

            if ((!membership || (membership.member_role !== "owner" && membership.member_role !== "moderator")) && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You do not have permission to approve snippets",
                });
            }

            const updatedSnippet = await SnippetModel.findOneAndUpdate(
                { _id: snippetId, group_id, is_deleted: false },
                { group_status: "approved" },
                { new: true }
            );

            if (!updatedSnippet) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Pending snippet not found in this group",
                });
            }

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Snippet approved successfully",
                data: updatedSnippet,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ─── REJECT SNIPPET (owner/mod only) ──────────────────────────────
    async rejectGroupSnippet(req, res) {
        try {
            const { id: group_id, snippetId } = req.params;

            const membership = await GroupMemberModel.findOne({
                group_id,
                user_id: req.user.id,
            });

            if ((!membership || (membership.member_role !== "owner" && membership.member_role !== "moderator")) && req.user.role !== "admin") {
                return res.status(status_Code.FORBIDDEN).json({
                    success: false,
                    message: "You do not have permission to reject snippets",
                });
            }

            // Remove from group, revert visibility to private.
            const updatedSnippet = await SnippetModel.findOneAndUpdate(
                { _id: snippetId, group_id, is_deleted: false },
                { group_id: null, visibility: "private", group_status: "approved" },
                { new: true }
            );

            if (!updatedSnippet) {
                return res.status(status_Code.NOT_FOUND).json({
                    success: false,
                    message: "Pending snippet not found in this group",
                });
            }

            return res.status(status_Code.SUCCESS).json({
                success: true,
                message: "Snippet rejected and removed from group",
                data: updatedSnippet,
            });
        } catch (error) {
            return res.status(status_Code.SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}

module.exports = new groupModelcontroller();
