const faker = require('faker');
const moment = require('moment');

const {
    Event,
    Application,
    MembersList,
    PaxLimit,
    VotesPerAntenna,
    VotesPerDelegate,
    Position,
    Candidate,
    Plenary,
    Attendance,
    QuestionLine,
    Question
} = require('../../models');

const notSet = (field) => typeof field === 'undefined';

const visaFields = [
    'visa_place_of_birth',
    'visa_passport_number',
    'visa_passport_issue_date',
    'visa_passport_expiration_date',
    'visa_passport_issue_authority',
    'nationality',
    'visa_embassy',
    'date_of_birth',
    'visa_street_and_house',
    'visa_postal_code',
    'visa_city',
    'visa_country'
];

exports.generateEvent = (options = {}) => {
    if (notSet(options.name)) options.name = faker.lorem.sentence();
    if (notSet(options.url)) options.url = options.name.toLowerCase().replace(/ /g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    if (notSet(options.description)) options.description = faker.lorem.paragraph();
    if (notSet(options.application_period_starts)) options.application_period_starts = faker.date.future();
    if (notSet(options.application_period_ends)) options.application_period_ends = faker.date.future(null, options.application_period_starts);
    if (notSet(options.board_approve_deadline)) options.board_approve_deadline = faker.date.future(null, options.application_period_ends);
    if (notSet(options.participants_list_publish_deadline)) options.participants_list_publish_deadline = faker.date.future(null, options.board_approve_deadline);
    if (notSet(options.memberslist_submission_deadline)) options.memberslist_submission_deadline = faker.date.future(null, options.participants_list_publish_deadline);
    if (notSet(options.draft_proposal_deadline)) options.draft_proposal_deadline = faker.date.future(null, options.application_period_starts);
    if (notSet(options.final_proposal_deadline)) options.final_proposal_deadline = faker.date.between(options.draft_proposal_deadline, options.memberslist_submission_deadline);
    if (notSet(options.candidature_deadline)) options.candidature_deadline = faker.date.between(options.application_period_starts, options.memberslist_submission_deadline);
    if (notSet(options.booklet_publication_deadline)) options.booklet_publication_deadline = faker.date.between(options.application_period_starts, options.memberslist_submission_deadline);
    if (notSet(options.updated_booklet_publication_deadline)) options.updated_booklet_publication_deadline = faker.date.between(options.booklet_publication_deadline, options.memberslist_submission_deadline);
    if (notSet(options.starts)) options.starts = faker.date.future(null, options.memberslist_submission_deadline);
    if (notSet(options.ends)) options.ends = faker.date.future(null, options.starts);
    if (notSet(options.fee)) options.fee = faker.datatype.number({ min: 0, max: 100 });
    if (notSet(options.body_id)) options.body_id = faker.datatype.number(100);
    if (notSet(options.type)) options.type = faker.random.arrayElement(['agora', 'epm']);

    if (notSet(options.questions)) {
        const questionsCount = Math.round(Math.random() * 5) + 1; // from 1 to 6
        options.questions = Array.from({ length: questionsCount }, () => exports.generateQuestionForEvent());
    }

    if (notSet(options.applications)) {
        options.applications = [];
    }

    return options;
};

exports.generateQuestionForEvent = (options = {}) => {
    if (notSet(options.description)) options.description = faker.lorem.sentence();
    if (notSet(options.required)) options.required = true;
    if (notSet(options.type)) options.type = 'string';
    if (notSet(options.values) && options.type === 'select') options.values = ['First', 'Second'];

    return options;
};

exports.generateApplication = (options = {}, event = null) => {
    if (notSet(options.user_id)) options.user_id = faker.datatype.number(100);
    if (notSet(options.body_id)) options.body_id = faker.datatype.number(100);
    if (notSet(options.board_comment)) options.board_comment = faker.lorem.paragraph();
    if (notSet(options.participant_type)) options.participant_type = faker.random.arrayElement(['delegate', 'visitor', 'observer', 'envoy']);
    if (notSet(options.participant_order)) options.participant_order = faker.datatype.number({ min: 1, max: 100 });

    // fields taken from application
    if (notSet(options.first_name)) options.first_name = faker.lorem.sentence();
    if (notSet(options.last_name)) options.last_name = faker.lorem.sentence();
    if (notSet(options.gender)) options.gender = faker.lorem.sentence();
    if (notSet(options.body_name)) options.body_name = faker.lorem.sentence();
    if (notSet(options.email)) options.email = faker.internet.email();
    if (notSet(options.notification_email)) options.notification_email = faker.internet.email();

    // visa fields
    if (notSet(options.visa_required)) options.visa_required = true;
    for (const visaField of visaFields) {
        if (notSet(options[visaField])) options[visaField] = faker.lorem.sentence();
    }

    if (notSet(options.meals)) options.meals = faker.lorem.sentence();
    if (notSet(options.number_of_events_visited)) options.number_of_events_visited = faker.datatype.number({ min: 0, max: 100 });

    if (notSet(options.answers)) {
        const answersCount = event ? event.questions.length : Math.round(Math.random() * 5) + 1; // from 1 to 6
        options.answers = Array.from({ length: answersCount }, () => faker.lorem.sentence());
    }

    if (event && event.id) {
        options.event_id = event.id;
    }

    return options;
};

exports.generateMembersList = (options = {}, event = null) => {
    if (notSet(options.currency)) options.currency = 'EU';
    if (notSet(options.user_id)) options.user_id = faker.datatype.number(100);
    if (notSet(options.body_id)) options.body_id = faker.datatype.number(100);
    if (notSet(options.members)) {
        const membersCount = Math.round(Math.random() * 5) + 1; // from 1 to 6
        options.members = Array.from({ length: membersCount }, (value, index) => exports.generateMembersListMember({
            user_id: index + 1
        }));
    }

    if (event && event.id) {
        options.event_id = event.id;
    }

    return options;
};

exports.generateMembersListMember = (options = {}) => {
    if (notSet(options.user_id)) options.user_id = faker.datatype.number(100);
    if (notSet(options.first_name)) options.first_name = faker.name.firstName();
    if (notSet(options.last_name)) options.last_name = faker.name.lastName();
    if (notSet(options.fee)) options.fee = faker.datatype.number({ min: 1, max: 1000 });

    return options;
};

exports.generatePaxLimit = (options = {}) => {
    if (notSet(options.body_id)) options.body_id = faker.datatype.number(100);
    if (notSet(options.delegate)) options.delegate = faker.datatype.number(100);
    if (notSet(options.visitor)) options.visitor = faker.datatype.number(100);
    if (notSet(options.observer)) options.observer = faker.datatype.number(100);
    if (notSet(options.envoy)) options.envoy = faker.datatype.number(100);
    if (notSet(options.event_type)) options.event_type = faker.random.arrayElement(['agora', 'epm']);

    return options;
};

exports.generatePosition = (options = {}, event = null) => {
    if (notSet(options.name)) options.name = faker.lorem.sentence();
    if (notSet(options.places)) options.places = faker.datatype.number({ min: 1, max: 10 });
    if (notSet(options.starts)) options.starts = faker.date.past();
    if (notSet(options.ends)) options.ends = faker.date.future();
    if (notSet(options.deleted)) options.deleted = false;
    if (notSet(options.start_term)) options.start_term = faker.date.future(null, options.ends);
    if (notSet(options.end_term)) options.end_term = faker.lorem.sentence();

    if (event && event.id) {
        options.event_id = event.id;
    }

    return options;
};

exports.generateCandidate = (options = {}, position) => {
    if (notSet(options.user_id)) options.user_id = faker.datatype.number({ min: 1, max: 100 });
    if (notSet(options.body_id)) options.body_id = faker.datatype.number({ min: 1, max: 100 });
    if (notSet(options.first_name)) options.first_name = faker.lorem.sentence();
    if (notSet(options.last_name)) options.last_name = faker.lorem.sentence();
    if (notSet(options.email)) options.email = faker.internet.email();
    if (notSet(options.date_of_birth)) options.date_of_birth = moment(faker.date.past()).format('YYYY-MM-DD');
    if (notSet(options.nationality)) options.nationality = faker.lorem.sentence();
    if (notSet(options.studies)) options.studies = faker.lorem.sentence();
    if (notSet(options.body_name)) options.body_name = faker.lorem.sentence();
    if (notSet(options.languages)) {
        options.languages = Array.from(
            { length: faker.datatype.number({ min: 1, max: 5 }) },
            () => faker.lorem.sentence()
        );
    }
    if (notSet(options.member_since)) options.member_since = moment(faker.date.past()).format('YYYY-MM-DD');
    if (notSet(options.european_experience)) options.european_experience = faker.lorem.paragraph();
    if (notSet(options.local_experience)) options.local_experience = faker.lorem.paragraph();
    if (notSet(options.attended_agorae)) options.attended_agorae = faker.lorem.paragraph();
    if (notSet(options.attended_epm)) options.attended_epm = faker.lorem.paragraph();
    if (notSet(options.attended_conferences)) options.attended_conferences = faker.lorem.paragraph();
    if (notSet(options.related_experience)) options.related_experience = faker.lorem.paragraph();
    if (notSet(options.external_experience)) options.external_experience = faker.lorem.paragraph();
    if (notSet(options.motivation)) options.motivation = faker.lorem.paragraph();
    if (notSet(options.program)) options.program = faker.lorem.paragraph();
    if (notSet(options.agreed_to_privacy_policy)) options.agreed_to_privacy_policy = true;

    if (position && position.id) {
        options.position_id = position.id;
    }

    return options;
};

exports.generateQuestionLine = (options = {}, event = null) => {
    if (notSet(options.name)) options.name = faker.lorem.sentence();

    if (event && event.id) {
        options.event_id = event.id;
    }

    return options;
};

exports.generateQuestion = (options = {}, questionLine = null) => {
    if (notSet(options.text)) options.text = faker.lorem.sentence();

    if (questionLine && questionLine.id) {
        options.question_line_id = questionLine.id;
    }

    return options;
};

exports.generatePlenary = (options = {}, event = null) => {
    if (notSet(options.name)) options.name = faker.lorem.sentence();
    if (notSet(options.starts)) options.starts = faker.date.future();
    if (notSet(options.ends)) options.ends = faker.date.future(null, options.starts);

    if (event && event.id) {
        options.event_id = event.id;
    }

    return options;
};

exports.generateAttendance = (options = {}, plenary = null) => {
    if (notSet(options.starts)) options.starts = faker.date.future();
    if (notSet(options.ends)) options.ends = faker.date.future(null, options.starts);

    if (plenary && plenary.id) {
        options.plenary_id = plenary.id;
    }

    return options;
};

exports.createEvent = (options = {}) => {
    return Event.create(exports.generateEvent(options), { include: [Application] });
};

exports.createApplication = (options = {}, event = null) => {
    return Application.create(exports.generateApplication(options, event));
};

exports.createMembersList = (options = {}, event = null) => {
    return MembersList.create(exports.generateMembersList(options, event));
};

exports.createPaxLimit = (options = {}) => {
    return PaxLimit.create(exports.generatePaxLimit(options));
};

exports.createPosition = (options = {}, event = null) => {
    return Position.create(exports.generatePosition(options, event), { include: [Candidate] });
};

exports.createCandidate = (options = {}, position = null) => {
    return Candidate.create(exports.generateCandidate(options, position));
};

exports.createPlenary = (options = {}, plenary = null) => {
    return Plenary.create(exports.generatePlenary(options, plenary), { include: [Attendance] });
};

exports.createAttendance = (options = {}, attendance = null) => {
    return Attendance.create(exports.generateAttendance(options, attendance));
};

exports.createQuestionLine = (options = {}, event = null) => {
    return QuestionLine.create(exports.generateQuestionLine(options, event), { include: [Question] });
};

exports.createQuestion = (options = {}, questionLine = null) => {
    return Question.create(exports.generateQuestion(options, questionLine));
};

exports.clearAll = async () => {
    await Question.destroy({ where: {}, truncate: { cascade: true } });
    await QuestionLine.destroy({ where: {}, truncate: { cascade: true } });
    await Attendance.destroy({ where: {}, truncate: { cascade: true } });
    await Plenary.destroy({ where: {}, truncate: { cascade: true } });
    await Candidate.destroy({ where: {}, truncate: { cascade: true } });
    await Position.destroy({ where: {}, truncate: { cascade: true } });
    await VotesPerDelegate.destroy({ where: {}, truncate: { cascade: true } });
    await VotesPerAntenna.destroy({ where: {}, truncate: { cascade: true } });
    await MembersList.destroy({ where: {}, truncate: { cascade: true } });
    await Application.destroy({ where: {}, truncate: { cascade: true } });
    await Event.destroy({ where: {}, truncate: { cascade: true } });
    await PaxLimit.destroy({ where: {}, truncate: { cascade: true } });
};
