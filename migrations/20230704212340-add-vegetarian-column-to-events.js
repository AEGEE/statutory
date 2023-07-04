module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.addColumn(
        'events',
        'vegetarian',
        { type: Sequelize.BOOLEAN, allowNull: false }
    ),
    down: (queryInterface) => queryInterface.removeColumn('events', 'vegetarian')
};
