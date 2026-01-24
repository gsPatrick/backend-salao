const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const Campaign = sequelize.define('campaign', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unitName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'unit_name'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    targetAudience: {
        type: DataTypes.JSONB,
        defaultValue: [],
        field: 'target_audience'
    },
    audienceCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'audience_count'
    },
    messageType: {
        type: DataTypes.ENUM('texto', 'imagem', 'audio', 'arquivo'),
        defaultValue: 'texto',
        field: 'message_type'
    },
    messageText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'message_text'
    },
    scheduleDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'schedule_date'
    },
    status: {
        type: DataTypes.ENUM('Agendada', 'Em Andamento', 'Concluída'),
        defaultValue: 'Agendada'
    },
    statsReach: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'stats_reach'
    },
    statsConversions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'stats_conversions'
    },
    statsRevenue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'stats_revenue'
    },
    archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'campaigns',
    underscored: true,
    getterMethods: {
        stats() {
            return {
                alcance: this.statsReach,
                conversoes: this.statsConversions,
                receita: parseFloat(this.statsRevenue)
            };
        }
    }
});

// To ensure stats shows up in JSON
Campaign.prototype.toJSON = function () {
    const values = { ...this.get() };
    values.stats = this.stats;
    return values;
};

module.exports = Campaign;
