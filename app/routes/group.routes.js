const express = require("express");
const router = express.Router();

const middlewareAuthCheck = require("../middleware/auth.middleware");
const groupcontroller = require("../controller/group.controller");
const requireAdmin = require("../middleware/admin.middleware");
const { uploadGroupAvatar } = require("../utils/cloud.imageupload");

// ─── GROUP ROUTES ─────────────────────────────────────────────────────────

// POST   /api/group/create/group        — create a new group (auth required)
// GET    /api/group/mygroup             — get all groups the user belongs to
// POST   /api/group/invite              — join a group via invite code
// PUT    /api/group/change-role         — change a member's role (owner only)
// DELETE /api/group/remove-member       — remove a member (owner only)

// GET    /api/group/all                 — get ALL groups (admin only)
router.get("/all", middlewareAuthCheck, requireAdmin, groupcontroller.getAllGroups);

router.post("/create/group", middlewareAuthCheck, uploadGroupAvatar.single("group_avatar"), groupcontroller.createGroup);
router.get("/mygroup", middlewareAuthCheck, groupcontroller.getmyGroup);
router.post("/invite", middlewareAuthCheck, groupcontroller.inviteMember);
router.put("/change-role", middlewareAuthCheck, groupcontroller.Rolechenge);
router.delete("/remove-member", middlewareAuthCheck, groupcontroller.removeMember);

// ─── GROUP DETAIL ROUTES ─────────────────────────────────────────────────
// These use :id — MUST come AFTER the named routes above to avoid conflicts

// GET    /api/group/:id                         — get group details + members (members only)
// PUT    /api/group/:id                         — update group name/desc/avatar (owner only)
// DELETE /api/group/:id                         — archive group (owner only)
// GET    /api/group/:id/snippets                — list group snippets (members only)
// PATCH  /api/group/:id/snippets/:snippetId     — assign a snippet to group

router.get("/:id", middlewareAuthCheck, groupcontroller.getGroupById);
router.put("/:id", middlewareAuthCheck, uploadGroupAvatar.single("group_avatar"), groupcontroller.updateGroup);
router.delete("/:id", middlewareAuthCheck, groupcontroller.archiveGroup);
router.get("/:id/snippets", middlewareAuthCheck, groupcontroller.getGroupSnippets);
router.get("/:id/snippets/pending", middlewareAuthCheck, groupcontroller.getPendingGroupSnippets);
router.patch("/:id/snippets/:snippetId", middlewareAuthCheck, groupcontroller.assignSnippetToGroup);
router.patch("/:id/snippets/:snippetId/approve", middlewareAuthCheck, groupcontroller.approveGroupSnippet);
router.delete("/:id/snippets/:snippetId/reject", middlewareAuthCheck, groupcontroller.rejectGroupSnippet);

module.exports = router;
