const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'tenants',
                key: 'id',
            },
            comment: 'null for Super Admin only',
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        avatar_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: 'https://i.pravatar.cc/150?u=default',
        },
        role: {
            type: DataTypes.ENUM('admin', 'gerente', 'recepcao', 'profissional', 'cliente'),
            allowNull: false,
            defaultValue: 'profissional',
        },
        is_super_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        permissions: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'users',
        timestamps: true,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    });

    User.prototype.comparePassword = async function (candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
    };

    User.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());
        delete values.password;
        return values;
    };

    User.associate = (models) => {
        User.belongsTo(models.Tenant, {
            foreignKey: 'tenant_id',
            as: 'tenant',
        });
    };

    return User;
};
