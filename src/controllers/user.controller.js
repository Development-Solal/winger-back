const { User, ProfileAidant, ProfileAidantPro, ListAge, ListTown, ListCommune, Subscription } = require("../models");
const  {sendTestMail} = require('../utils/mail')
const { Op } = require("sequelize");

const getUserById = async (req, res) => {
  const { userId } = req.params;

  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ message: 'You can only access your own data.' });
  }

  try {
    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "first_name", "last_name", "email", "is_email_verified", "credits", "roleId", "createdAt"],
      include: [
        {
          model: ProfileAidant,
          attributes: ["profile_type_id","profile_pic", "active"],
          include: [
            {
              model: Subscription,
              as: "subscription", // match the alias
              attributes: ["status", "start_time", "next_billing_time"],
              where: {
                [Op.or]: [
                  { status: "active" },
                  {
                    status: "cancelled",
                    next_billing_time: { [Op.gt]: new Date() }
                  }
                ]
              },
              required: false,
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const getAidantByUser = async (req, res) => {
    const { userId } = req.params;
  

    if (req.user.id !== parseInt(userId) && req.user.roleId !=1 ) {
      return res.status(403).json({ message: 'You can only access your own data.' });
    }
  
    try {
      const aidant = await ProfileAidant.findOne({
        where: { user_id: userId },
        attributes: ["id", "profile_number", "first_name", "last_name", "email", "profile_pic", "profile_type_id", "age_id", "town_id", "commune_id", "active", "online", "aidant_deactivated"],
        include: [
            {
                model: ListAge,
                attributes: ["title"],
                as: "age"
            },
            {
                model: ListTown,
                attributes: ["town"],
                as: "town"
            },
            {
                model: ListCommune,
                attributes: ["name"],
                as: "commune"
            },
          ],
      });
  
      if (!aidant) {
        return res.status(404).json({ message: "Aidant not found." });
      }
  
      res.status(200).json(aidant);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

const getAidantProByUser = async (req, res) => {
    const { userId } = req.params;
  
    if (req.user.id !== parseInt(userId) && req.user.roleId !=1) {
      return res.status(403).json({ message: 'You can only access your own data.' });
    }
  
    try {
      const aidant = await ProfileAidant.findOne({
        where: { user_id: userId },
        attributes: ["id", "profile_number", "first_name", "last_name", "email", "profile_pic", "profile_type_id", "town_id", "active", "online", "aidant_deactivated"],
        include: [
            {
                model: ListTown,
                attributes: ["town"],
                as: "town"
            },
            {
                model: ProfileAidantPro,
                attributes: ["company_id", "company_name", "company_description","contract_signed" ],
                // as: "ProfileAidants"
            },
          ],
      });
  
      if (!aidant) {
        return res.status(404).json({ message: "Aidant not found." });
      }
  
      res.status(200).json(aidant);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error." });
    }
};

const testEmail = async(req, res) => {
  try {

    sendTestMail()
    res.status(200);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error." });
  }
}

module.exports = { getUserById, getAidantByUser, getAidantProByUser, testEmail };
