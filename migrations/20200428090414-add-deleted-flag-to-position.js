module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(
      'positions',
      'deleted',
      { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: '0' }
  ),
  down: queryInterface => queryInterface.removeColumn('postiions', 'deleted')
};
