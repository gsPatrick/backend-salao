const authService = require('./auth.service');

class AuthController {
    /**
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios',
                });
            }

            const result = await authService.login(email, password);

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: result,
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Erro ao fazer login',
            });
        }
    }

    /**
     * POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { tenantName, userName, email, password, planId } = req.body;

            if (!tenantName || !userName || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos os campos são obrigatórios',
                });
            }

            const result = await authService.register({
                tenantName,
                userName,
                email,
                password,
                planId,
            });

            res.status(201).json({
                success: true,
                message: 'Cadastro realizado com sucesso',
                data: result,
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Erro ao fazer cadastro',
            });
        }
    }

    /**
     * POST /api/auth/refresh
     */
    async refreshToken(req, res) {
        try {
            const result = await authService.refreshToken(req.user);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Erro ao renovar token',
            });
        }
    }

    /**
     * GET /api/auth/me
     */
    async getProfile(req, res) {
        try {
            const user = await authService.getProfile(req.userId);

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Erro ao buscar perfil',
            });
        }
    }

    /**
     * PUT /api/auth/password
     */
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha atual e nova senha são obrigatórias',
                });
            }

            if (newPassword.length < 4) {
                return res.status(400).json({
                    success: false,
                    message: 'A nova senha deve ter pelo menos 4 caracteres',
                });
            }

            const result = await authService.changePassword(
                req.userId,
                currentPassword,
                newPassword
            );

            res.json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Erro ao alterar senha',
            });
        }
    }
}

module.exports = new AuthController();
