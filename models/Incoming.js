const { Sequelize, sequelize } = require('../lib/sequelize');
const helpers = require('../lib/helpers');
const Event = require('./Event');

const Incoming = sequelize.define('incoming', {
    application_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'Application ID should be set.' },
            isInt: { msg: 'Application ID should be a number.' }
        },
    },
    event_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'Event should be set.' },
            isInt: { msg: 'Event ID should be a number.' }
        },
    },
    user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: '',
        validate: {
            isInt: { msg: 'User ID should be a number.' }
        },
        unique: { args: true, msg: 'There\'s already an incoming form with such user ID for this event.' }
    },
    pronouns: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: '',
        validate: {
            notEmpty: { msg: 'Pronouns should be set.' }
        }
    },
    arrival_date: {
        type: Sequelize.DATE,
        allowNull: true,
        validate: {
            isDate: { msg: 'Expected arrival date should be valid.' }
        }
    },
    arrival_route: {
        allowNull: true,
        type: Sequelize.TEXT
    },
    departure_date: {
        type: Sequelize.DATE,
        allowNull: true,
        validate: {
            isDate: { msg: 'Expected depature date should be valid.' },
            laterThanStart(val) {
                if (moment(val).isSameOrBefore(this.arrival_time)) {
                    throw new Error('Departure date cannot be after or at the same time the arrival date.');
                }
            }
        }
    },
    departure_route: {
        allowNull: true,
        type: Sequelize.TEXT
    },
    answers: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '',
        validate: {
            async isValid(value) {
                if (!Array.isArray(value)) {
                    throw new Error('Answers should be an array of strings.');
                }

                const event = await Event.findOne({ where: { id: this.event_id } });
                /* istanbul ignore next */
                if (!event) {
                    throw new Error('Could not find event.');
                }

                if (event.incoming_questions.length !== value.length) {
                    throw new Error(`Expected ${event.incoming_questions.length} answers, but got ${value.length}.`);
                }

                for (let index = 0; index < value.length; index++) {
                    switch (event.incoming_questions[index].type) {
                    case 'string':
                    case 'text':
                        if (typeof value[index] !== 'string') {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}"): expected a string, got ${typeof value[index]}.`);
                        }

                        if (value[index].trim().length === 0 && event.incoming_questions[index].required) {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}") is empty.`);
                        }
                        break;
                    case 'number':
                        if (Number.isNaN(Number(value[index]))) {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}") should be a number, but got "${value[index]}".`);
                        }
                        break;
                    case 'select':
                        if (!event.incoming_questions[index].values.includes(value[index])) {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}") should be one of these: ${event.incoming_questions[index].values.join(', ')}, but got "${value[index]}".`);
                        }
                        break;
                    case 'checkbox':
                        if (typeof value[index] !== 'boolean') {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}"): type should be boolean, but got "${typeof value[index]}".`);
                        }

                        if (value[index] !== true && event.incoming_questions[index].required) {
                            throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}"): you should agree.`);
                        }
                        break;
                    /* istanbul ignore next */
                    default:
                        throw new Error(`Answer number ${index + 1} ("${event.incoming_questions[index].description}"): unknown question type: ${event.incoming_questions[index].type}`);
                    }
                }
            }
        }
    },
    agreed_to_privacy_statement: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: '',
        validate: {
            isValid(value) {
                if (value !== true) {
                    throw new Error('You should agree to the Privacy Statement.');
                }
            }
        }
    },
}, {
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

Incoming.findWithParams = ({ where, attributes, query }) => {
    const findAllObject = { where };

    if (helpers.isDefined(attributes)) {
        findAllObject.attributes = attributes;
    }

    // Trying to apply limit and offset.
    for (const key of ['limit', 'offset']) {
        // If not defined, ignoring it.
        if (!helpers.isDefined(query[key])) {
            continue;
        }

        findAllObject[key] = Number(query[key]);
    }

    // Sorting by ID desc by default.
    const sorting = [['id', 'desc']];

    // Trying to apply sorting fields.
    if (helpers.isObject(query.sort)) {
        if (helpers.isDefined(query.sort.field)) {
            sorting[0][0] = query.sort.field;
        }

        if (helpers.isDefined(query.sort.order)) {
            sorting[0][1] = query.sort.order;
        }
    }

    return Incoming.findAndCountAll(findAllObject);
};

module.exports = Incoming;
