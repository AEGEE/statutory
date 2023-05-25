module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn(
            'incoming',
            'pronouns',
            { type: Sequelize.STRING, allowNull: false }
        );

        await queryInterface.addColumn(
            'incoming',
            'arrival_date',
            { type: Sequelize.DATE, allowNull: true }
        );

        await queryInterface.addColumn(
            'incoming',
            'departure_date',
            { type: Sequelize.DATE, allowNull: true }
        );

        await queryInterface.addColumn(
            'incoming',
            'arrival_route',
            { type: Sequelize.STRING, allowNull: true }
        );

        await queryInterface.addColumn(
            'incoming',
            'departure_route',
            { type: Sequelize.STRING, allowNull: true }
        );

        await queryInterface.addColumn(
            'incoming',
            'agreed_to_privacy_statement',
            { type: Sequelize.BOOLEAN, allowNull: false }
        );
    },
    down: async (queryInterface) => {
        await queryInterface.removeColumn(
            'incoming',
            'pronouns'
        );

        await queryInterface.removeColumn(
            'incoming',
            'arrival_date'
        );

        await queryInterface.removeColumn(
            'incoming',
            'departure_date'
        );

        await queryInterface.removeColumn(
            'incoming',
            'arrival_route'
        );

        await queryInterface.removeColumn(
            'incoming',
            'departure_route'
        );

        await queryInterface.removeColumn(
            'incoming',
            'agreed_to_privacy_statement'
        );
    }
};
