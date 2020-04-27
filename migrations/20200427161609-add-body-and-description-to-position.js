module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(
      'positions',
      'body_id',
      { type: Sequelize.INTEGER, allowNull: false }
  ),
  down: queryInterface => queryInterface.removeColumn('postiions', 'body')
};
