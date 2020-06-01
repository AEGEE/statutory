'use strict';

module.exports = {
    down: (queryInterface, Sequelize) => queryInterface.addColumn(
        'candidates',
        'gender',
        {
            type: Sequelize.STRING, allowNull: false, defaultValue: '',
        }
    ),
    up: queryInterface => queryInterface.removeColumn('candidates', 'gender')
};
