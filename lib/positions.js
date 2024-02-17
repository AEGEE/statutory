const xlsx = require('node-xlsx').default;

const core = require('./core');
const errors = require('./errors');
const { Position, Candidate, Image } = require('../models');
const helpers = require('./helpers');
const constants = require('./constants');

exports.findPosition = async (req, res, next) => {
    if (Number.isNaN(Number(req.params.position_id))) {
        return errors.makeBadRequestError(res, 'The position ID is invalid.');
    }

    const position = await Position.findOne({
        where: {
            id: Number(req.params.position_id),
            deleted: false
        }
    });

    if (!position) {
        return errors.makeNotFoundError(res, 'Position is not found.');
    }

    req.permissions = helpers.getPositionPermissions({
        permissions: req.permissions,
        position
    });

    req.position = position;
    return next();
};

exports.listAllPositions = async (req, res) => {
    const positions = await Position.findAll({
        where: { event_id: req.event.id, deleted: false },
        order: [['created_at', 'ASC']]
    });
    return res.json({
        success: true,
        data: positions
    });
};

exports.listPositionsWithAllCandidates = async (req, res) => {
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You cannot manage positions.');
    }

    let positions = await Position.findAll({
        where: { event_id: req.event.id, deleted: false },
        order: [
            ['created_at', 'ASC'],
            [Candidate, 'created_at', 'ASC']
        ],
        include: [{
            model: Candidate,
            include: Image
        }]
    });

    positions = await Promise.all(positions.map(async (position) => {
        position.candidates = await Promise.all(position.candidates
            .map(async (candidate) => {
                const user = await core.fetchApplicationUser(candidate.user_id);

                candidate.dataValues.notification_email = user.notification_email;

                return candidate;
            }));
        return position;
    }));

    return res.json({
        success: true,
        data: positions
    });
};

exports.listPositionsWithApprovedCandidates = async (req, res) => {
    let positions = await Position.findAll({
        where: { event_id: req.event.id, deleted: false },
        order: [
            ['created_at', 'ASC'],
            [Candidate, 'created_at', 'ASC']
        ],
        include: [{
            model: Candidate,
            include: Image
        }]
    });

    positions = await Promise.all(positions.map(async (position) => {
        position.candidates = await Promise.all(position.candidates
            .map(async (candidate) => {
                const user = await core.fetchApplicationUser(candidate.user_id);

                candidate.dataValues.notification_email = user.notification_email;

                return candidate;
            }));
        return position;
    }));

    // Only returning these candidatures which are approved.
    // For those pending (rejected would be filtered out),
    // only the id and the status would be returned.
    // Status is for every position, so we can filter on that
    // on the frontend.
    const filtered = positions.map((position) => {
        const jsonPosition = position.toJSON();

        jsonPosition.candidates = position.candidates
            .filter((candidate) => candidate.status !== 'rejected')
            .map((candidate) => {
                if (candidate.status === 'approved') {
                    return helpers.blacklistObject(candidate.toJSON(), ['notification_email']); // the email should be visible to JC only
                }

                return helpers.whitelistObject(candidate.toJSON(), constants.ALLOWED_PENDING_CANDIDATE_FIELDS);
            });

        return jsonPosition;
    });

    return res.json({
        success: true,
        data: filtered
    });
};

exports.createPosition = async (req, res) => {
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You cannot manage positions.');
    }

    delete req.body.status;
    req.body.event_id = req.event.id;

    const newPosition = await Position.create(req.body);

    return res.json({
        success: true,
        data: newPosition
    });
};

exports.editPosition = async (req, res) => {
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You cannot manage positions.');
    }

    delete req.body.status;
    delete req.body.id;
    delete req.body.event_id;
    await req.position.update(req.body);

    return res.json({
        success: true,
        data: req.position
    });
};

exports.deletePosition = async (req, res) => {
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You cannot manage positions.');
    }

    await req.position.update({ deleted: true });

    return res.json({
        success: true,
        message: 'The position was deleted.'
    });
};

exports.updatePositionStatus = async (req, res) => {
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You cannot manage positions.');
    }

    if (helpers.isDefined(req.body.status)) {
        await req.position.update({ status: req.body.status });
    }

    return res.json({
        success: true,
        data: req.position
    });
};

exports.exportAll = async (req, res) => {
    // Exporting candidates as XLSX for JC/whoever.
    if (!req.permissions.manage_candidates) {
        return errors.makeForbiddenError(res, 'You are not allowed to export candidates.');
    }

    if (!Array.isArray(req.query.select)) {
        req.query.select = Object.keys(constants.CANDIDATE_FIELDS);
    }

    if (typeof req.query.filter !== 'object') {
        req.query.filter = {};
    }

    // Default query is empty.
    const defaultFilter = {};

    // Then applying user filter on it.
    const applicationsFilter = Object.assign(defaultFilter, req.query.filter);

    const headersNames = constants.CANDIDATE_FIELDS;
    const headers = req.query.select.map((field) => headersNames[field]);

    let applications = await Candidate.findAll({
        where: {
            '$position.event_id$': req.event.id,
            ...applicationsFilter,
            '$position.deleted$': false
        },
        include: [{
            model: Position, select: ['name', 'id', 'deleted']
        }]
    });

    applications = await Promise.all(applications
        .map(async (application) => {
            const user = await core.fetchApplicationUser(application.user_id);

            application.dataValues.notification_email = user.notification_email;

            return application;
        }));

    const resultArray = applications
        .map((application) => application.toJSON())
        .map((application) => helpers.flattenObject(application))
        .map((application) => {
            return req.query.select.map((field) => helpers.beautify(application[field]));
        });

    const resultBuffer = xlsx.build([
        {
            name: 'Candidates stats',
            data: [
                headers,
                ...resultArray
            ]
        }
    ]);

    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-disposition', 'attachment; filename=stats.xlsx');

    return res.send(resultBuffer);
};
