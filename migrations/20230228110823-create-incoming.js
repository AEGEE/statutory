module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('incoming', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        application_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'applications',
                key: 'id'
            }
        },
        event_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'events',
                key: 'id'
            }
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        answers: { type: Sequelize.JSONB, allowNull: false },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE
        }
    }),
    down: (queryInterface) => queryInterface.dropTable('incoming')
};
