module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'events',
            'incoming_questions',
            { type: Sequelize.JSONB, allowNull: true },
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn(
            'events',
            'incoming_questions'
        );
    }
};
