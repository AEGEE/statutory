const errors = require('./errors');
const { Application, Incoming } = require('../models');

exports.listAllIncoming = async (req, res) => {
    if (!req.permissions.see_incoming) {
        return errors.makeForbiddenError(res, 'You are not allowed to see all incoming forms.');
    }

    const incoming = await Incoming.findWithParams({
        where: { event_id: req.event.id },
        query: req.query
    });

    return res.json({
        success: true,
        data: incoming.rows,
        meta: {
            count: incoming.count
        }
    });
};

exports.getIncoming = async (req, res) => {
    if (!req.permissions.see_incoming) {
        return errors.makeForbiddenError(res, 'You are not allowed to see this incoming form.');
    }

    const incoming = req.incoming.toJSON();
    incoming.permissions = req.permissions;

    return res.json({
        success: true,
        data: incoming
    });
};

exports.updateIncoming = async (req, res) => {
    if (!req.permissions.edit_incoming) {
        return errors.makeForbiddenError(res, 'You cannot edit this incoming form.');
    }

    await req.incoming.update({ answers: req.body.answers }, { transaction: t });

    return res.json({
        success: true,
        data: req.incoming
    });
};

exports.postIncoming = async (req, res) => {
    if (!req.permissions.edit_incoming) {
        return errors.makeForbiddenError(res, 'You cannot create this incoming form.');
    }

    const application = await Application.findOne({ where: {
        id: req.body.application_id,
        status: 'accepted',
        cancelled: false
    } });

    if (!application) {
        return errors.makeForbiddenError(res, 'Your application does not fulfill the requirements to submit an incoming form.');
    }

    const newIncoming = await Incoming.create(req.body, { transaction: t });

    return res.json({
        success: true,
        data: newIncoming
    });
};
